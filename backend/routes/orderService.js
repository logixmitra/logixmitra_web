const { Order, OrderItem,Shipment,Seller,User,Warehouse,Wallet,Integration } = require('../models');


const { Op, literal } = require('sequelize');
const axios = require('axios');
const dotenv = require('dotenv');
const xpressbeesService = require('./xpressbeesService');
const bluedartService = require('./bluedartService');
const innofulfillService = require('./innofulfillService');
const { generateUniqueReferenceId, resolveUniqueReferenceId } = require('../utils/orderReference');
const {
  resolvePackageMeta,
  isCodOrder,
  resolveCodAmount,
  resolveOrderAmount,
  resolveDiscount,
  resolveShippingCharges,
  resolveTax,
  resolveCountry,
  resolveAddressType,
  resolveAddressTypeForCourier,
  resolveAlternatePhone,
  normalizeOrderForShipment,
} = require('../utils/orderShipmentMeta');
dotenv.config();

class OrderService {



calculateVolumetricWeight(height, width, length) {
    if (!height || !width || !length) return null;
    return Number(((height * width * length) / 5000).toFixed(2));
  }

  // Calculate total price including GST

  //  calculateTotalPrice(unitPrice, quantity, gstRate) {
  //   const subtotal = unitPrice * quantity;
  //   const gstAmount = (subtotal * gstRate) / 100;
  //   return Number((subtotal + gstAmount ).toFixed(2));
  // }
  calculateTotalPrice(unitPrice, quantity, gstRate, discount = 0) {
    const gross = Number(unitPrice || 0) * Number(quantity || 1);
    const gstAmount = (gross * Number(gstRate || 0)) / 100;
    return Number(Math.max(0, gross + gstAmount - Number(discount || 0)).toFixed(2));
  }

  


  // Calculate order totals
  calculateOrderTotals(items, extras = {}) {
    let totalItems = 0;
    let totalWeight = 0;
    let totalVolumetricWeight = 0;
    let totalAmount = 0;

    items.forEach(item => {
      totalItems += item.quantity;

      if (item.deadWeight) {
        totalWeight += item.deadWeight * item.quantity;
      }

      if (item.volumetricWeight) {
        totalVolumetricWeight += item.volumetricWeight;
      }

      totalAmount += item.totalPrice;
    });

    const discount = Math.max(0, parseFloat(extras.totalDiscounts) || 0);
    const shipping = Math.max(0, parseFloat(extras.totalShippingPrice) || 0);
    const payable = Math.max(0, totalAmount + shipping - discount);

    return {
      totalItems,
      totalWeight: totalWeight > 0 ? Number(totalWeight.toFixed(2)) : null,
      totalVolumetricWeight: totalVolumetricWeight > 0 ? Number(totalVolumetricWeight.toFixed(2)) : null,
      itemsTotal: Number(totalAmount.toFixed(2)),
      totalAmount: `₹${payable.toFixed(2)}`,
      payable: Number(payable.toFixed(2)),
    };
  }

async createOrder(orderData , updatetrue=true) {
  const transaction = await Order.sequelize.transaction();

  try {
    let order;

    // 🔹 Process items
    const items = Array.isArray(orderData.items) ? orderData.items : [];
    const processedItems = items.map(item => ({
      ...item,
      volumetricWeight: this.calculateVolumetricWeight(item.height, item.width, item.length),
      totalPrice: this.calculateTotalPrice(item.unitPrice, item.quantity, item.gstRate, item.discount)
    }));

    const totals = this.calculateOrderTotals(processedItems, {
      totalDiscounts: orderData.order?.totalDiscounts,
      totalShippingPrice: orderData.order?.totalShippingPrice,
    });

    // 🔥 STEP 1: Find existing order
    if (orderData.order?.id) {
      order = await Order.findByPk(orderData.order.id, { transaction });
    }

    // 🔥 STEP 2: If not found by ID → check by orderNumber
    if (!order && orderData.order?.referenceId) {
      order = await Order.findOne({
        where: { referenceId: orderData.order.referenceId,seller:String(orderData.order.seller)||String(orderData.order.user_id) }, 
        transaction 
      });
    }
    

    if (order )  {
      if(updatetrue==false){
        return  
      }
      // 🔄 UPDATE
      // await order.update({
      //   ...orderData.order,
      //   user_id: orderData.order.user_id || order.user_id,
      //   amount: totals.totalAmount,
      //   totalItems: totals.totalItems,
      //   totalWeight: totals.totalWeight,
      //   totalVolumetricWeight: totals.totalVolumetricWeight
      // }, { transaction });

      // // 🗑️ delete old items
      // await OrderItem.destroy({
      //   where: { orderId: order.id },
      //   transaction
      // });

    } else {
      // 🆕 CREATE
      const referenceId = await resolveUniqueReferenceId(orderData.order?.referenceId, { transaction });

      // Keep Shopify/Woo totals (includes COD charge + shipping); don't overwrite with items-only sum
      const platform = orderData.order?.platform;
      const rawAmount = orderData.order?.amount;
      const parsedProvided = parseFloat(String(rawAmount ?? '').replace(/[^0-9.-]/g, ''));
      const keepPlatformAmount =
        (platform === 'Shopify' || platform === 'WooCommerce') &&
        !Number.isNaN(parsedProvided);

      order = await Order.create({
        ...orderData.order,
        referenceId,
        user_id: orderData.order.user_id,
        amount: keepPlatformAmount
          ? String(parsedProvided)
          : (Number.isFinite(parsedProvided) && parsedProvided > 0
            ? (String(rawAmount).includes('₹') ? String(rawAmount) : `₹${parsedProvided.toFixed(2)}`)
            : totals.totalAmount),
        totalItems: totals.totalItems,
        totalWeight: orderData.order.totalWeight ?? totals.totalWeight,
        totalVolumetricWeight: orderData.order.totalVolumetricWeight ?? totals.totalVolumetricWeight
      }, { transaction });
    }

    // 🔁 Insert items
    const orderItems = processedItems.map(item => ({
      ...item,
      orderId: order.id
    }));

    await OrderItem.bulkCreate(orderItems, { transaction });

    await transaction.commit();

    return await this.getOrderById(order.id);

  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}



 


async getAllOrders(filters = {}) {
  const where = {};
  const andConditions = [];

  if (filters.status) {
    const statusKey = String(filters.status).trim().toLowerCase();
    // Courier Assigned: AWB generated / courier booked + pickup/manifest stage,
    // anything not yet actually picked / in-transit / delivered / RTO.
    if (
      statusKey === 'ready for dispatch' ||
      statusKey === 'ready to ship' ||
      statusKey === 'courier assigned'
    ) {
      andConditions.push({
        [Op.and]: [
          {
            awb: {
              [Op.and]: [
                { [Op.ne]: null },
                { [Op.ne]: '' },
                { [Op.ne]: '-' },
              ],
            },
          },
          {
            [Op.or]: [
              { status: null },
              { status: { [Op.iLike]: '%ready for dispatch%' } },
              { status: { [Op.iLike]: '%ready to ship%' } },
              { status: { [Op.iLike]: '%courier assigned%' } },
              { status: { [Op.iLike]: '%label created%' } },
              { status: { [Op.iLike]: '%manifest%' } },
              { status: { [Op.iLike]: '%pickup scheduled%' } },
              { status: { [Op.iLike]: '%out for pickup%' } },
              { status: { [Op.iLike]: '%shipment expected%' } },
              { status: { [Op.iLike]: '%shipped%' } },
              { status: { [Op.iLike]: '%booked%' } },
              { status: { [Op.iLike]: '%assigned%' } },
            ],
          },
        ],
      });
    } else if (
      statusKey === 'out for pickup' ||
      statusKey === 'pickups & manifests' ||
      statusKey === 'pickups and manifests'
    ) {
      // Pickups & Manifests tab: pre-pickup pool (pickup/manifest/label stages).
      andConditions.push({
        [Op.and]: [
          {
            awb: {
              [Op.and]: [
                { [Op.ne]: null },
                { [Op.ne]: '' },
                { [Op.ne]: '-' },
              ],
            },
          },
          {
            [Op.or]: [
              { status: { [Op.iLike]: '%pickup%' } },
              { status: { [Op.iLike]: '%manifest%' } },
              { status: { [Op.iLike]: '%label created%' } },
              { status: { [Op.iLike]: '%ready for dispatch%' } },
              { status: { [Op.iLike]: '%ready to ship%' } },
            ],
          },
        ],
      });
      andConditions.push({
        [Op.and]: [
          { status: { [Op.notILike]: '%Picked Up%' } },
          { status: { [Op.notILike]: '%Pickup Complete%' } },
          { status: { [Op.notILike]: '%In Transit%' } },
          { status: { [Op.notILike]: '%RTO%' } },
        ],
      });
    } else if (statusKey === 'in transit') {
      // True forward journey only — pickup/manifest/RTO stages stay out.
      andConditions.push({
        [Op.and]: [
          { status: { [Op.iLike]: '%In Transit%' } },
          { status: { [Op.notILike]: '%RTO%' } },
          { status: { [Op.notILike]: '%Return to Origin%' } },
          { status: { [Op.notILike]: '%manifest%' } },
          { status: { [Op.notILike]: '%pickup scheduled%' } },
          { status: { [Op.notILike]: '%out for pickup%' } },
          { status: { [Op.notILike]: '%label created%' } },
          { status: { [Op.notILike]: '%shipment expected%' } },
          { status: { [Op.notILike]: '%shipped%' } },
        ],
      });
    } else if (statusKey === 'pending' || statusKey === 'new') {
      // New orders: Pending and not yet courier/AWB assigned
      andConditions.push({
        [Op.and]: [
          { status: { [Op.iLike]: 'Pending' } },
          {
            [Op.or]: [
              { awb: null },
              { awb: '' },
              { awb: '-' },
            ],
          },
        ],
      });
    } else if (
      statusKey === 'rto in transit' ||
      statusKey === 'rto in-transit' ||
      statusKey === 'rto initiated'
    ) {
      andConditions.push({
        [Op.or]: [
          { status: { [Op.iLike]: '%RTO In transit%' } },
          { status: { [Op.iLike]: '%RTO In Transit%' } },
          { status: { [Op.iLike]: '%RTO INITIATED%' } },
          { status: { [Op.iLike]: 'RTO' } },
          { status: { [Op.iLike]: '%Return to Origin%' } },
          {
            [Op.and]: [
              { status: { [Op.iLike]: '%RTO%' } },
              { status: { [Op.notILike]: '%Delivered%' } },
            ],
          },
        ],
      });
    } else if (statusKey === 'rto delivered') {
      andConditions.push({
        [Op.or]: [
          { status: { [Op.iLike]: '%RTO Delivered%' } },
          { status: { [Op.iLike]: '%rto_delivered%' } },
        ],
      });
    } else if (statusKey === 'undelivered' || statusKey === 'ndr') {
      andConditions.push({
        [Op.or]: [
          { status: { [Op.iLike]: '%UNDELIVERED%' } },
          { status: { [Op.iLike]: '%NDR%' } },
          { status: { [Op.iLike]: '%undelivered%' } },
        ],
      });
    } else {
      where.status = filters.status;
    }
  }

  if (filters.platform) {
    where.platform = filters.platform;
  }

  // B2B workspace uses orderType filter; Orders page shows B2C + B2B_MPS (Shipmozo-style)
  // and excludes dedicated freight consignments unless explicitly requested.
  if (filters.orderType) {
    where.orderType = filters.orderType;
  } else {
    andConditions.push({
      [Op.or]: [
        { orderType: null },
        { orderType: 'B2C' },
        { orderType: 'B2B_MPS' },
        { orderType: { [Op.notIn]: ['B2B_FREIGHT'] } },
      ],
    });
  }

  if (filters.user_id) {
    where.user_id = filters.user_id;
  }

  if (filters.courier && filters.courier !== 'all') {
    where.courier = { [Op.iLike]: `%${filters.courier}%` };
  }

  if (filters.financialStatus && filters.financialStatus !== 'all') {
    where.financialStatus = filters.financialStatus;
  }

  if (filters.awb) {
    where.awb = { [Op.iLike]: `%${filters.awb}%` };
  }

  // Forward: exclude RTO/reverse only (NDR/UNDELIVERED still show in All).
  // Reverse: RTO + undelivered/NDR (includes legacy "Return to Origin").
  // Skip direction constraints when an explicit status chip is selected.
  const reverseStatusPattern = { [Op.or]: [
    { status: { [Op.iLike]: '%RTO%' } },
    { status: { [Op.iLike]: '%return to origin%' } },
    { status: { [Op.iLike]: '%UNDELIVERED%' } },
    { status: 'UNDELIVERED' },
    { status: { [Op.iLike]: '%NDR%' } },
    { status: { [Op.iLike]: '%Reattempt%' } },
  ]};
  if (!filters.status) {
    if (filters.direction === 'reverse') {
      andConditions.push(reverseStatusPattern);
    }
    // Forward / All: include RTO orders. Reverse tab still filters to RTO/NDR.
  }

  if (filters.search) {
    const raw = String(filters.search).trim();
    const term = `%${raw}%`;
    const searchOr = [
      { orderNumber: { [Op.iLike]: term } },
      { referenceId: { [Op.iLike]: term } },
      { customerName: { [Op.iLike]: term } },
      { customerPhone: { [Op.iLike]: term } },
      { customerEmail: { [Op.iLike]: term } },
      { pincode: { [Op.iLike]: term } },
      { seller: { [Op.iLike]: term } },
      { awb: { [Op.iLike]: term } },
    ];
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw)) {
      searchOr.push({ id: raw });
    }
    andConditions.push({
      [Op.or]: searchOr,
    });
  }

  if (filters.startDate || filters.endDate || filters.startDateDay || filters.endDateDay) {
    const dateType = String(filters.dateType || 'Order Created');
    // YYYY-MM-DD day strings for DATEONLY columns (orderDate / deliveredDate).
    const dayOf = (value) => String(value).slice(0, 10);
    const startDay = filters.startDateDay || (filters.startDate ? dayOf(filters.startDate) : undefined);
    const endDay = filters.endDateDay || (filters.endDate ? dayOf(filters.endDate) : undefined);
    const tsOf = (value, endOfDay) => {
      const raw = String(value);
      if (raw.includes('T')) return raw;
      return `${dayOf(raw)}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`;
    };

    if (dateType === 'Delivered Date') {
      const range = {};
      if (startDay) range[Op.gte] = startDay;
      if (endDay) range[Op.lte] = endDay;
      if (Object.keys(range).length) where.deliveredDate = range;
    } else if (dateType === 'Updated Date') {
      const range = {};
      if (filters.startDate) range[Op.gte] = tsOf(filters.startDate, false);
      if (filters.endDate) range[Op.lte] = tsOf(filters.endDate, true);
      where.updatedAt = range;
    } else if (dateType === 'createdAt' || dateType === 'created_at') {
      const range = {};
      if (filters.startDate) range[Op.gte] = tsOf(filters.startDate, false);
      if (filters.endDate) range[Op.lte] = tsOf(filters.endDate, true);
      where.createdAt = range;
    } else {
      // "Order Created" (default): same value as the Order Date column —
      // orderDate (DATEONLY, calendar day) when present, else createdAt.
      const branches = [];
      if (startDay || endDay) {
        const dayRange = {};
        if (startDay) dayRange[Op.gte] = startDay;
        if (endDay) dayRange[Op.lte] = endDay;
        branches.push({ orderDate: dayRange });
      }
      if (filters.startDate || filters.endDate) {
        const tsRange = {};
        if (filters.startDate) tsRange[Op.gte] = tsOf(filters.startDate, false);
        if (filters.endDate) tsRange[Op.lte] = tsOf(filters.endDate, true);
        branches.push({ orderDate: null, createdAt: tsRange });
      }
      if (branches.length) andConditions.push({ [Op.or]: branches });
    }
  }

  if (andConditions.length) {
    where[Op.and] = andConditions;
  }

  const include = [{
    model: OrderItem,
    as: 'items',
  }];
  const statusKey = String(filters.status || '').trim().toLowerCase();
  const assignPickupSort =
    statusKey === 'ready for dispatch' ||
    statusKey === 'ready to ship' ||
    statusKey === 'courier assigned' ||
    statusKey === 'out for pickup' ||
    statusKey === 'pickups & manifests';
  const order = assignPickupSort
    ? [['updatedAt', 'DESC'], ['createdAt', 'DESC'], ['id', 'DESC']]
    : [
        // Order Details number ka leading numeric part (1052, 1051, 1050...)
        // bada number sabse upar; naam wale orders (NULL) neeche — DESC me
        // NULLs by default pehle aate hain, isliye NULLS LAST zaroori hai.
        literal(
          `CASE WHEN COALESCE(TRIM("Order"."orderNumber"), '') ~ '^[0-9]+' ` +
          `THEN substring(TRIM("Order"."orderNumber") from '^[0-9]+')::bigint END DESC NULLS LAST`
        ),
        ['createdAt', 'DESC'],
        ['id', 'DESC'],
      ];

  const paginate = filters.paginate !== 'false' && filters.paginate !== false;
  const page = Math.max(parseInt(filters.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(filters.limit, 10) || 10, 1), 200);

  if (!paginate) {
    const orders = await Order.findAll({ where, include, order });
    return orders;
  }

  const { rows, count } = await Order.findAndCountAll({
    where,
    include,
    order,
    limit,
    offset: (page - 1) * limit,
    distinct: true,
  });

  return {
    data: rows,
    pagination: {
      total: count,
      page,
      limit,
      totalPages: Math.max(Math.ceil(count / limit), 1),
    },
  };
}




  // Get order by ID
  async getOrderById(id) {
    const order = await Order.findByPk(id, {
      include: [{
        model: OrderItem,
        as: 'items'
      }]
    });

    if (!order) {
      throw new Error('Order not found');
    }

    return order;
  }

  /**
   * Unique clone numbers: ORD-c-1, ORD-c-2, ORD-c-1-c-1, ORD-c-1-c-2
   */
  async _buildCloneOrderNumber(sourceOrderNumber = 'ORD', transaction = null) {
    const stem = String(sourceOrderNumber || 'ORD').trim() || 'ORD';
    const likePattern = `${stem}-c-%`;
    const existing = await Order.findAll({
      where: { orderNumber: { [Op.iLike]: likePattern } },
      attributes: ['orderNumber'],
      transaction,
    });

    const escaped = stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`^${escaped}-c-(\\d+)$`, 'i');
    let maxN = 0;
    for (const row of existing) {
      const match = String(row.orderNumber || '').match(pattern);
      if (match) {
        const n = parseInt(match[1], 10);
        if (!Number.isNaN(n) && n > maxN) maxN = n;
      }
    }
    return `${stem}-c-${maxN + 1}`;
  }

  async cloneOrder(id, payload = {}) {
    const sourceOrder = await this.getOrderById(id);
    const transaction = await Order.sequelize.transaction();

    try {
      const requestedReferenceId = payload?.referenceId ? String(payload.referenceId).trim() : '';
      if (requestedReferenceId) {
        const existing = await Order.findOne({
          where: { referenceId: requestedReferenceId },
          attributes: ['id'],
          transaction,
        });
        if (existing) {
          const conflictError = new Error('Reference ID already exists');
          conflictError.statusCode = 409;
          throw conflictError;
        }
      }

      const source = sourceOrder.toJSON();
      const sourceItems = Array.isArray(source.items) ? source.items : [];
      const cloneReferenceId = requestedReferenceId || await generateUniqueReferenceId({ transaction });
      const cloneOrderNumber = await this._buildCloneOrderNumber(source.orderNumber, transaction);

      const allowedOrderFields = Object.keys(Order.rawAttributes || {}).filter(
        (key) => !['id', 'createdAt', 'updatedAt'].includes(key)
      );
      const clonePayload = {};
      for (const key of allowedOrderFields) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          clonePayload[key] = source[key];
        }
      }

      Object.assign(clonePayload, {
        orderNumber: cloneOrderNumber,
        referenceId: cloneReferenceId,
        status: 'Pending',
        courier: '-',
        awb: '-',
        trackingnumber: null,
        tracking_history: null,
        processedAt: null,
        cancelledAt: null,
        cancelReason: null,
        chargecor: null,
        zone: null,
        ndrreason: '',
        merge_status: '',
        merge_order: null,
        dispute_status: '',
        dispute_reason: '',
        dispute_file: '',
        dispute_file_: '',
        shopifyOrderId: null,
        rtoCharged: false,
        rtoCharge: null,
      });

      if (clonePayload.customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(clonePayload.customerEmail))) {
        clonePayload.customerEmail = null;
      }
      const allowedFinancial = ['paid', 'partially_paid', 'pending', 'refunded', 'voided'];
      if (clonePayload.financialStatus && !allowedFinancial.includes(clonePayload.financialStatus)) {
        clonePayload.financialStatus = 'paid';
      }
      const allowedFulfillment = ['fulfilled', 'partial', 'pending', 'restocked', 'null'];
      if (clonePayload.fulfillmentStatus && !allowedFulfillment.includes(clonePayload.fulfillmentStatus)) {
        clonePayload.fulfillmentStatus = null;
      }

      const createdOrder = await Order.create(clonePayload, { transaction });
      const allowedItemFields = Object.keys(OrderItem.rawAttributes || {}).filter(
        (key) => !['id', 'createdAt', 'updatedAt'].includes(key)
      );
      const clonedItems = sourceItems.map((item) => {
        const clonedItem = { orderId: createdOrder.id };
        for (const key of allowedItemFields) {
          if (key === 'orderId') continue;
          if (Object.prototype.hasOwnProperty.call(item, key)) {
            clonedItem[key] = item[key];
          }
        }
        return clonedItem;
      });

      if (clonedItems.length > 0) {
        await OrderItem.bulkCreate(clonedItems, { transaction });
      }

      await transaction.commit();
      return await this.getOrderById(createdOrder.id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

/**
 * Ensures ewbn is exactly 12 digits
 * @param {string|number} ewbnInput
 * @returns {string} 12-digit string
 * @throws Error if invalid input
 */
formatEwbn(ewbnInput) {
  if (ewbnInput === undefined || ewbnInput === null) {
    throw new Error("EWBN is required");
  }

  // Convert to string
  let ewbnStr = String(ewbnInput).trim();

  // Remove any non-digit characters
  ewbnStr = ewbnStr.replace(/\D/g, "");

  if (ewbnStr.length > 12) {
    throw new Error("EWBN cannot be more than 12 digits");
  }

  // Pad with leading zeros if less than 12 digits
  ewbnStr = ewbnStr.padStart(12, "0");

  // Final validation
  if (!/^\d{12}$/.test(ewbnStr)) {
    throw new Error("EWBN must be exactly 12 digits");
  }

  return ewbnStr;
}
 
 convertToShipmentFormat(order, sellerInfo = {},data22) {
  order = normalizeOrderForShipment(order);

  // Helper function to safely parse numbers
  const safeParseFloat = (value, defaultValue = 0) => {
    if (!value && value !== 0) return defaultValue;
    if (typeof value === 'number') return value;
    const parsed = parseFloat(value.toString().replace(/[^0-9.-]/g, ''));
    return isNaN(parsed) ? defaultValue : parsed;
  };
  
  // Helper function to clean phone numbers
  const cleanPhoneNumber = (phone) => {
    if (!phone) return '';
    const cleaned = phone.toString().replace(/[^0-9]/g, '');
    return cleaned.slice(0, 10);
  };
  
  const paymentMode = isCodOrder(order) ? 'COD' : 'Prepaid';
  const pkg = resolvePackageMeta(order);
  const totalAmount = resolveOrderAmount(order) || safeParseFloat(order.amount || order.totalPrice || 0);
  const taxableAmount = safeParseFloat(order.subtotalPrice || 0);
  const taxValue = resolveTax(order) || safeParseFloat(order.totalTax || 0);
  const codAmount = resolveCodAmount(order);
  
  // Get items array (from order.items or empty array)
  const items = order.items || [];
  
  // Build products description
  const productsDesc = items.map(item => item.name).filter(Boolean).join(', ');
  
  // Calculate total quantity
  const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
  
  const totalWeight = pkg.deadWeight;
  const maxLength = pkg.length;
  const maxWidth = pkg.width;
  const maxHeight = pkg.height;
  
  // Default seller info (if not provided)
  const defaultSellerInfo = {
    name: order.seller || "My Store",
    address: "Seller Address",
    city: "City",
    state: "State",
    pincode: "000000",
    phone: "0000000000",
    gstTin: "27AAACA1234A1Z"
  };
  
  const seller = { ...defaultSellerInfo, ...sellerInfo };
  
  // Build drop location (customer shipping address)
  const dropLocation = {
    location_type: resolveAddressTypeForCourier(order, 'ekart'),
    address: order.addressLine1 || order.shippingAddress?.address1 || "Customer Address",
    city: order.city || order.shippingAddress?.city || "City",
    state: order.state || order.shippingAddress?.province || "State",
    country: resolveCountry(order),
    name: order.customerName || "Customer",
    phone: parseInt(cleanPhoneNumber(order.customerPhone)) || 6388612947,
    pin: parseInt(order.pincode) || 201301,
    email: order.customerEmail || undefined,
  };
  
  // Add addressLine2 if exists
  if (order.addressLine2 || order.shippingAddress?.address2 || order.landmark) {
    dropLocation.address += `, ${order.addressLine2 || order.shippingAddress?.address2 || order.landmark}`;
  }
  dropLocation.alternate_phone = parseInt(resolveAlternatePhone(order)) || undefined;
  
  // Build pickup location (seller address)
  const pickupLocation = {
    location_type: "Office",
    address: seller.address,
    city: seller.city,
    state: seller.state,
    country: "India",
    name: seller.name,
    phone: parseInt(cleanPhoneNumber(seller.phone)) || 0,
    pin: parseInt(seller.pincode) || 0
  };
  
  // Build return location (same as pickup or separate)
  const returnLocation = {
    location_type: "Office",
    address: seller.returnAddress || seller.address,
    city: seller.returnCity || seller.city,
    state: seller.returnState || seller.state,
    country: "India",
    name: seller.returnName || seller.name,
    phone: parseInt(cleanPhoneNumber(seller.returnPhone || seller.phone)) || 0,
    pin: parseInt(seller.returnPincode || seller.pincode) || 0
  };
  
  // Format dates
  const invoiceDate = order.orderDate || new Date(order.createdAt).toISOString().split('T')[0];
  const preferredDispatchDate = order.processedAt 
    ? order.processedAt.toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];
  
  // Process each item with GST calculations
  const processedItems = items.map(item => {
    const unitPrice = safeParseFloat(item.unitPrice);
    const quantity = item.quantity || 1;
    const gstRate = item.gstRate == null ? 0 : Number(item.gstRate);
    const taxableValue = Math.max(0, unitPrice * quantity);
    const itemTaxValue = (taxableValue * gstRate) / 100;
    
    // Determine if IGST or CGST/SGST based on state match
    const isIntraState = (order.state === seller.state) && order.state && seller.state;
    const igstTaxValue = !isIntraState ? itemTaxValue : 0;
    const cgstTaxValue = isIntraState ? itemTaxValue / 2 : 0;
    const sgstTaxValue = isIntraState ? itemTaxValue / 2 : 0;
    
    return {
      product_name: item.name || '',
      sku: item.sku || item.productId || '',
      taxable_value: Math.round(taxableValue * 100) / 100,
      description: item.description || item.name || '',
      quantity: quantity,
      length: item.length || pkg.length || 1,
      height: item.height || pkg.height || 3,
      breadth: item.width || pkg.width || 2,
      weight: Math.max(1, Math.round((Number(item.deadWeight) || pkg.deadWeight || 0.2) * 1000)),
      hsn_code: item.hsnCode || item.hsn || '998411',
      cgst_tax_value: Math.round(cgstTaxValue * 100) / 100,
      sgst_tax_value: Math.round(sgstTaxValue * 100) / 100,
      igst_tax_value: Math.round(igstTaxValue * 100) / 100
    };
  });
  
  // Get first item for QC details
  const firstItem = items[0] || {};
  
  // Build QC details
  const qcDetails = {
    qc_shipment: false,
    product_name: firstItem.name || '',
    product_desc: firstItem.description || firstItem.name || '',
    product_sku: firstItem.sku || firstItem.productId || '',
    product_color: firstItem.color || '',
    product_size: firstItem.size || '',
    brand_name: firstItem.brand || '',
    product_category: firstItem.category || '',
    ean_barcode: firstItem.eanBarcode || '',
    serial_number: firstItem.serialNumber || '',
    imei_number: firstItem.imeiNumber || '',
    product_images: firstItem.images || []
  };
  
  // Build final shipment object
  const shipment = {
    seller_name: seller.name,
    seller_address: seller.address,
    seller_gst_tin: seller.gstTin,
    seller_gst_amount: Math.round(taxValue * 100) / 100,
    consignee_gst_amount: 0,
    integrated_gst_amount: Math.round(taxValue * 100) / 100,
    ewbn: order.awb && order.awb !== '-' ? order.awb : this.formatEwbn(123456789),
    order_number: order.referenceId || "",
    invoice_number: `INV-${order.referenceId || order.id.slice(0, 8)}`,
    invoice_date: invoiceDate,
    document_number: order.referenceId || "",
    document_date: invoiceDate,
    consignee_gst_tin: order.consigneeGstTin || "27AAACA1234A1Z",
    consignee_name: order.customerName || dropLocation.name,
    consignee_alternate_phone: cleanPhoneNumber(resolveAlternatePhone(order) || order?.alternatePhone),
    products_desc: productsDesc,
    payment_mode: paymentMode,
    category_of_goods: order.categoryOfGoods || "Others",
    hsn_code: processedItems[0]?.hsn_code || "998411",
    total_amount: Math.round(totalAmount * 100) / 100,
    tax_value: Math.round(taxValue * 100) / 100,
    taxable_amount: Math.round(taxableAmount * 100) / 100,
    commodity_value: Math.round(totalAmount * 100) / 100 + "",
    cod_amount: codAmount,
    quantity: totalQuantity,
    weight: totalWeight,
    length: maxLength,
    height: maxHeight,
    width: maxWidth,
    return_reason: order.returnReason || "",
    drop_location: dropLocation,
    pickup_location: pickupLocation,
    return_location: returnLocation,
    qc_details: qcDetails,
    preferred_dispatch_date: this.addTwoDaysSafe(data22.dispatchdate[order.referenceId] || preferredDispatchDate),
    delayed_dispatch: false,
    obd_shipment: order.obdShipment || false,
    mps: order.mps || pkg.packageCount > 1,
    items: processedItems,
    what3words_address: order.what3wordsAddress || ""
  };
  
  // Remove undefined/null values
  const cleanObject = (obj) => {
    if (Array.isArray(obj)) {
      return obj.map(cleanObject);
    }
    if (obj && typeof obj === 'object') {
      Object.keys(obj).forEach(key => {
        if (obj[key] === undefined || obj[key] === null) {
          delete obj[key];
        } else if (typeof obj[key] === 'object') {
          cleanObject(obj[key]);
        }
      });
    }
    return obj;
  };
  
  return cleanObject(shipment);
}

async getekarttoken(){
        
       let response=await fetch('https://app.elite.ekartlogistics.in/integrations/v2/auth/token/EKART_6995807edcc54747b4c875ac', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
  "username": process.env.EKART_USERNAME || "",
  "password": process.env.EKART_PASSWORD || ""
})
})
if(!response.ok){
  return null
}

response=await response.json()
return response




}






  async createShippmentekart(orderdata,wareid,data22){

    // console.log({
    //   where: { referenceId:orderdata?.referenceId || "" }    },"orderdataorderdataorderdataorderdataorderdataorderdataorderdataorderdataorderdataorderdataorderdataorderdata")
  
  
  
      try {
    const shipment = await Shipment.count({
      where: { referenceId:orderdata?.referenceId || "" }    });
    
      if(orderdata.awb.length>5)



        {

 let orderd = await Order.findOne({
      where: { referenceId:orderdata?.referenceId  || ""}    });                    

orderd=orderd.get()

    orderd.items=orderdata.items
    orderd = await this._hydrateOrderForShipment(orderd);

    //  let seller = await User.findOne({
    //   where: { id:orderd?.seller  || ""}    });  


           let warehouse_ = await Warehouse.findOne({
      where: { id:wareid || ""}    });  
      
      // console.log(seller,"seller>>>>>>>>>>>>>>>>>>>")


const sellerInfo = {
  name: warehouse_.name,
  address: warehouse_.address,
  city: warehouse_.city,
  state: warehouse_.state,
  pincode: warehouse_?.pincode|| 122001,
  phone: warehouse_.phone,
  gstTin: warehouse_?.gst || "",
  returnAddress:warehouse_.address,
  returnCity: warehouse_.city,
  returnState: warehouse_.state,
  returnPincode: warehouse_.pincode,
  returnPhone: warehouse_.phone
};




// Convert the order
const convertedShipment = orderd.platform=="Manual" || orderd.platform=="Merged" ?this.transformOrdermantoekart(orderd,sellerInfo,data22) :this.convertToShipmentFormat(orderd, sellerInfo,data22);
const { access_token } = await this.getekarttoken();
console.log({
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization':'Bearer '+access_token
  },
  body: JSON.stringify(convertedShipment)
},">>>>>>><<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<")
 let response=await fetch('https://app.elite.ekartlogistics.in/api/v1/package/create', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization':'Bearer '+access_token
  },
  body: JSON.stringify(convertedShipment)
})
response=await response.json()


console.log(response,"response>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>ekartpush")

if(response?.tracking_id){
 const newShipment = await Shipment.create({
      referenceId: orderdata.referenceId,
      shipmentjson: convertedShipment || null,
      shipmenttracking:response || null
    });
  }
  return response




}
      
     

  

  } catch (error) {
    console.log(error,"mmmmmmmmmmmnnnn")

    return error
  
  }

  }



  addTwoDaysSafe(inputDate) {
  const d = new Date(inputDate);
  if (isNaN(d)) throw new Error("Invalid date");

  d.setDate(d.getDate() + 3);
  return d.toISOString().split('T')[0];
}

   convertshopifytoinnufill(order, sellerInfo,data22,tmpindex) {
    // --- Helper functions ---
    const parseAmount = (amountStr) => {
        if (typeof amountStr !== 'string') return 0;
        const numeric = amountStr.replace(/[^0-9.-]/g, '');
        return parseFloat(numeric) || 0;
    };

    const toNumber = (val) => {
        if (val === null || val === undefined) return 0;
        const num = Number(val);
        return isNaN(num) ? 0 : num;
    };

    // Convert kg to grams
    const kgToGrams = (kg) => Math.round(toNumber(kg) * 1000);

    let totalWeightGrams = 0;
    // Build lineItems from order.items
    const lineItems = (order.items || []).map(item => {
        // Item weight: use deadWeight if available, otherwise 0 (could distribute totalWeight later)
        let itemWeightGrams = 1;
        if (item.deadWeight !== null && item.deadWeight !== undefined) {
            itemWeightGrams = kgToGrams(item.deadWeight);
        }
        totalWeightGrams += itemWeightGrams;
        return {
            name: item.name || "",
            price: toNumber(item.totalPrice),
            weight: itemWeightGrams,
            quantity: toNumber(item.quantity),
            sku: item.sku || item.productId || item.id || "",
            unitPrice: toNumber(item.unitPrice)
        };
    });

    // Compute total weight in grams (use order.totalWeight if available)
    // let totalWeightGrams = 0;
    // if (order.totalWeight !== null && order.totalWeight !== undefined) {
    //     totalWeightGrams = kgToGrams(order.totalWeight);
    // } else {
    //     // Fallback: sum item deadWeight
    //     totalWeightGrams = lineItems.reduce((sum, item) => sum + item.weight, 0);
    // }

    // Determine payment type and status
    const paymentType = isCodOrder(order) ? 'COD' : 'ONLINE';
    const paymentStatus = isCodOrder(order) ?  "PAID" : "PENDING";

    // Subtotal (before tax)
    const subTotal = toNumber(order.subtotalPrice);

    // GST percentage (if totalTax and subtotalPrice exist)
    let gstPercent = 0;
    if (subTotal > 0 && order.totalTax) {
        const tax = toNumber(order.totalTax);
        gstPercent = (tax / subTotal) * 100;
    }

    // Discount (totalDiscounts or discountCodes)
    const discount = this._resolveOrderDiscount(order);

    // Package dimensions – package totals first, then items
    const pkgMeta = resolvePackageMeta(order);
    const maxLen = pkgMeta.length;
    const maxWid = pkgMeta.width;
    const maxHei = pkgMeta.height;

    // Helper to map address from order's shippingAddress or top-level fields
    const mapAddress = () => {
        
            // Fallback to top-level address fields
            return {
                name: order.customerName || "",
                email: order.customerEmail || "",
                phone: order.customerPhone.replace("+91","") || "",
                address1: order.addressLine1 || "",
                address2: order.addressLine2 || "",
                city: order.city || "",
                state: order.state || "",
        country: resolveCountry(order),
                zip: order.pincode || "",
                latitude: null,
                longitude: null
            };
        
        // return {
        //     name: `${order.first_name || ""} ${src.last_name || ""}`.trim() || src.name || "",
        //     email: order.customerEmail || "",
        //     phone: src.phone.replace("+91","")  || "",
        //     address1: src.address1 || "",
        //     address2: src.address2 || "",
        //     city: src.city || "",
        //     state: src.province || src.state || "",
        //     country: src.country || "India",
        //     zip: src.zip || src.pincode || "",
        //     latitude: src.latitude || null,
        //     longitude: src.longitude || null
        // };
    };

    // Build pickup and return addresses from sellerInfo
    const pickupAddress = {
        name: sellerInfo.name || "",
        email: "",  // not provided in sellerInfo
        phone: sellerInfo.phone.replace("+91","")  || "",
        address1: sellerInfo.address || "",
        address2: "",
        city: sellerInfo.city || "",
        state: sellerInfo.state || "",
        country: "India",
        zip: sellerInfo.pincode || "122001",
        latitude: null,
        longitude: null
    };

    const returnAddress = {
        name: sellerInfo.name || "",
        email: "",
        phone: sellerInfo.returnPhone.replace("+91","") || sellerInfo.phone.replace("+91","")  || "",
        address1: sellerInfo.returnAddress || sellerInfo.address || "",
        address2: "",
        city: sellerInfo.returnCity || sellerInfo.city || "",
        state: sellerInfo.returnState || sellerInfo.state || "",
        country: "India",
        zip: sellerInfo.returnPincode || sellerInfo.pincode || "122001",
        latitude: null,
        longitude: null
    };

    // Final output object
    return {
        orderId: order.referenceId || order.id,
        orderSubtype: "FORWARD",
        readyToPick: false,
        orderCreatedAt:data22.dispatchdate[order.referenceId] || order.processedAt || order.createdAt || new Date().toISOString(),
        currency: order.currency || "INR",
        amount: parseAmount(order.amount),
        weight: pkgMeta.deadWeight > 0 ? Math.round(pkgMeta.deadWeight * 1000) : totalWeightGrams,
        lineItems: lineItems, 
        paymentType: paymentType,
        paymentStatus: paymentStatus,
        subTotal: subTotal,
        remarks: "",  // no remarks field in source
        shippingAddress: mapAddress(),
        billingAddress: mapAddress(),
        pickupAddress: pickupAddress,
        returnAddress: returnAddress,
        gst: parseFloat(gstPercent.toFixed(2)),
        deliveryPromise:data22.ratelist[order.referenceId].type[data22.coureir[tmpindex]].toLowerCase().includes("air")?"AIR":"SURFACE",
        discountUnit: "RUPEES",
        discount: discount,
        length: maxLen,
        height: maxHei,
        width: maxWid
    };
}


 transformOrdermantoinnufiil(order, sellerInfo,data22,tmpindex) {
  // Parse amount (remove currency symbol like ₹)
  const amountNum = parseFloat(order.amount.replace(/[^0-9.-]/g, ''));
  
  // Calculate subtotal from line items (unitPrice × quantity)
  const subtotal = order.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  
  // Convert total weight from kg to grams
  // const weightGrams = (order.totalWeight || .5) * 1000;
  
  // Transform line items
  const lineItems = order.items.map(item => ({
    name: item.name,
    price: item.totalPrice,
    weight: Number((item.deadWeight || .5)*1000), // Convert kg to grams
    quantity: item.quantity,
    sku: item.id || "",
    unitPrice: item.unitPrice
  }));



  const weightGrams = order.items.map(item => (item.deadWeight || .5) * 1000).reduce((sum, w) => sum + w, 0);
  const weightKg = weightGrams / 1000

  
  // Construct shipping address from order data
  const shippingAddress = {
    name: order.customerName,
    email: order.customerEmail,
    phone: order.customerPhone,
    address1: order.addressLine1,
    address2: order.addressLine2 || order.landmark || "",
    city: order.city,
    state: order.state,
    country: "India",
    zip: order.pincode,
    latitude: null,
    longitude: null
  };
  
  // Billing address (same as shipping in this case)
  const billingAddress = { ...shippingAddress };
  
  // Pickup address from seller info
  const pickupAddress = {
    name: sellerInfo.name,
    email: "",
    phone: sellerInfo.phone,
    address1: sellerInfo.address,
    address2: "",
    city: sellerInfo.city,
    state: sellerInfo.state,
    country: "India",
    zip: sellerInfo.pincode,
    latitude: null,
    longitude: null
  };
  
  // Return address from seller info
  const returnAddress = {
    name: sellerInfo.name,
    email: "",
    phone: sellerInfo.returnPhone,
    address1: sellerInfo.returnAddress,
    address2: "",
    city: sellerInfo.returnCity,
    state: sellerInfo.returnState,
    country: "India",
    zip: sellerInfo.returnPincode,
    latitude: null,
    longitude: null
  };
  
  // Get first item dimensions (or default to 0)
  const firstItem = order.items[0] || {};
  
  return {
    orderId: order.referenceId || order.id,
    orderSubtype: "FORWARD",
    readyToPick: false,
    orderCreatedAt: data22.dispatchdate[order.referenceId] || order.createdAt,
    currency: order.currency,
    amount: amountNum,
    weight: Math.round(weightGrams),
    lineItems: lineItems,
    paymentType: order.financialStatus == "pending" ? 'COD' : 'ONLINE',
    paymentStatus: (order.financialStatus || "pending").toUpperCase(),
    subTotal: subtotal,
    remarks: "",
    shippingAddress: shippingAddress,
    billingAddress: billingAddress,
    pickupAddress: pickupAddress,
    returnAddress: returnAddress,
    gst: parseFloat(sellerInfo.gstTin) || 0,
    deliveryPromise: data22.ratelist[order.referenceId].type[data22.coureir[tmpindex]].toLowerCase().includes("air")?"AIR":"SURFACE",
    discountUnit: "RUPEES",
    discount: this._resolveOrderDiscount(order),
    length: firstItem.length || 0,
    height: firstItem.height || 0,
    width: firstItem.width || 0
  };
}

 transformOrdermantoekart(order, sellerInfo,data22) {
  order = normalizeOrderForShipment(order);
  // Helper to parse amount string (e.g., "₹23.60" -> 23.60)
  const parseAmount = (amountStr) => parseFloat(amountStr.replace(/[^0-9.-]/g, ''));

  // Extract data
  const totalAmount = resolveOrderAmount(order) || parseAmount(order.amount);
  const totalTax = resolveTax(order) || parseFloat(order.totalTax) || 0;
  const taxableAmount = totalAmount - totalTax;
  const pkg = resolvePackageMeta(order);
  const codAmount = resolveCodAmount(order);
  const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const totalWeight = pkg.deadWeight;

  
  // Get first item for dimensions and description
  const firstItem = order.items[0] || {};
  const productDesc = order.items.map(i => i.name).join(', ') || '';

  // Compute tax values per item (for items array) and totals
  let totalCgst = 0, totalSgst = 0, totalIgst = 0;
  const itemsDetail = order.items.map(item => {
    const taxableValue = Math.max(0, (item.unitPrice || 0) * (item.quantity || 1));
    const taxAmount = (taxableValue * Number(item.gstRate || 0)) / 100;
    let cgst = 0, sgst = 0, igst = 0;
    if (item.gstRate) {
      // Assuming 50% CGST and 50% SGST for intra-state, or full IGST for inter-state.
      // Here we default to intra-state (CGST+SGST) as state is same? Not sure, set IGST=0.
      cgst = taxAmount / 2;
      sgst = taxAmount / 2;
      igst = 0;
    }
    totalCgst += cgst;
    totalSgst += sgst;
    totalIgst += igst;
    return {
      product_name: item.name,
      sku: item.sku || item.productId || '',
      taxable_value: taxableValue,
      description: item.name,
      quantity: item.quantity,
      length: item.length || pkg.length || 0,
      height: item.height || pkg.height || 0,
      breadth: item.width || pkg.width || 0,
      weight: item.deadWeight || pkg.deadWeight || 0,
      hsn_code: item.hsnCode || item.hsn || '',
      cgst_tax_value: cgst,
      sgst_tax_value: sgst,
      igst_tax_value: igst
    };
  });

  // Drop location (consignee)
  const dropLocation = {
    location_type: resolveAddressTypeForCourier(order, 'ekart'),
    address: [order.addressLine1, order.addressLine2, order.landmark].filter(Boolean).join(', '),
    city: order.city,
    state: order.state,
    country: resolveCountry(order),
    name: order.customerName,
    phone: parseInt(String(order.customerPhone || '').replace(/\D/g, '').slice(-10)) || 0,
    pin: parseInt(order.pincode) || 0,
    email: order.customerEmail || undefined,
  };

  // Pickup location (seller)
  const pickupLocation = {
    location_type: "Office",
    address: sellerInfo.address,
    city: sellerInfo.city,
    state: sellerInfo.state,
    country: "India",
    name: sellerInfo.name,
    phone: parseInt(sellerInfo.phone) || 0,
    pin: parseInt(sellerInfo.pincode) || 0
  };

  // Return location (same as pickup)
  const returnLocation = {
    location_type: "Office",
    address: sellerInfo.returnAddress || sellerInfo.address,
    city: sellerInfo.returnCity || sellerInfo.city,
    state: sellerInfo.returnState || sellerInfo.state,
    country: "India",
    name: sellerInfo.name,
    phone: parseInt(sellerInfo.returnPhone || sellerInfo.phone) || 0,
    pin: parseInt(sellerInfo.returnPincode || sellerInfo.pincode) || 0
  };

  // QC details (optional minimal)
  const qcDetails = {
    qc_shipment: false,
    product_name: firstItem.name || '',
    product_desc: firstItem.name || '',
    product_sku: firstItem.sku || firstItem.productId || firstItem.id || '',
    product_color: '',
    product_size: '',
    brand_name: '',
    product_category: '',
    ean_barcode: '',
    serial_number: '',
    imei_number: '',
    product_images: []
  };

  // Current date for preferred dispatch
  const today = new Date().toISOString().slice(0, 10);

  return {
    seller_name: sellerInfo.name,
    seller_address: sellerInfo.address,
    seller_gst_tin: sellerInfo.gstTin || '',
    seller_gst_amount: totalCgst + totalSgst + totalIgst, // total GST collected by seller
    consignee_gst_amount: 0,
    integrated_gst_amount: totalIgst,
    ewbn: order.awb && order.awb !== '-' ? order.awb : this.formatEwbn(123456789),
    order_number: order.referenceId,
    invoice_number: order.id, // using order id as invoice number
    invoice_date: today, // YYYY-MM-DD
    document_number: '',
    document_date: '',
    consignee_gst_tin: '',
    consignee_name: order.customerName,
    consignee_alternate_phone: resolveAlternatePhone(order), 
    products_desc: productDesc,
    payment_mode: isCodOrder(order) ? 'COD' : 'Prepaid',
    category_of_goods: '',
    hsn_code: firstItem.hsnCode || firstItem.hsn || '',
    total_amount: totalAmount,
    tax_value: totalTax,
    taxable_amount: taxableAmount,
    commodity_value: totalAmount.toString(),
    cod_amount: codAmount,
    quantity: totalQuantity,
    templateName: '',
    weight: totalWeight || 0, // in kg (adjust if eKART expects grams)
    length: pkg.length || 0,
    height: pkg.height || 0,
    width: pkg.width || 0,
    return_reason: '',
    drop_location: dropLocation,
    pickup_location: pickupLocation,
    return_location: returnLocation,
    qc_details: qcDetails, 
    preferred_dispatch_date: this.addTwoDaysSafe(data22.dispatchdate[order.referenceId] || order.orderDate),
    delayed_dispatch: false,
    obd_shipment: false,
    mps: pkg.packageCount > 1,
    items: itemsDetail,
    what3words_address: ''
  };
}

// Example usage with your provided data (assuming sellerInfo is built from seller object)
// const seller = { name: "Seller Name", address: "Seller Address", city: "City", state: "State", pincode: "122001", phone: "9876543210", gst: "29AAAAA0000A1Z" };
// const sellerInfo = { ... };
// const ekartPayload = convertToEkartFormat(order, sellerInfo);
// console.log(ekartPayload);


  
 async getinnofulfilltoken(){
    try {
      return await innofulfillService.getToken();
    } catch (e) {
      console.log(e, "innofulfilltoken");
      return "";
    }
  }

 async createShippmentinnufill(sourceOrder, wareid, data22, tmpindex) {
    try {
      sourceOrder = await this._hydrateOrderForShipment(sourceOrder);
      const warehouse_ = await Warehouse.findOne({
        where: { id: wareid || "" }
      });

      if (!warehouse_) {
        return { status: 400, message: "Warehouse not found", data: null };
      }

      if (!Array.isArray(sourceOrder.items) || sourceOrder.items.length === 0) {
        return { status: 400, message: "Order items missing for SMC shipment", data: null };
      }

      const response = await innofulfillService.createShipment(
        sourceOrder,
        warehouse_,
        data22,
        tmpindex
      );

      console.log(response, "innofulfillresponse");

      if (response?.status == 200) {
        await Shipment.create({
          referenceId: sourceOrder.referenceId,
          shipmentjson: response.payload || null,
          shipmenttracking: response || null
        });
      }

      return response;
    } catch (e) {
      console.log(e, "innofulfillerror");
      return { status: 500, message: e.message || "Error creating shipment", data: null };
    }
  }






 convertDelhiveryShipment(order, sellerInfo) { 
  try {
    const item = order.items?.[0] || {};
    const pkg = resolvePackageMeta(order);
    const totalAmount = parseFloat(
      String(order.amount || 0).replace(/[₹,]/g, "")
    );
    const discountAmount = resolveDiscount(order);

    // Shipment payload
    const payload = {
      shipments: [
        {
          // Customer
          name: order.customerName,

          add: [
            order.addressLine1,
            order.addressLine2,
            order.landmark
          ]
            .filter(Boolean)
            .join(", "),

          pin: order.pincode,

          city: order.city,

          state: order.state,

          country: resolveCountry(order),

          phone: order.customerPhone,

          // Order
          order: order.orderNumber || order.referenceId,
          seller_inv: order.sellerOrderId || order.orderNumber || "",

          payment_mode: isCodOrder(order) ? "COD" : "Prepaid",

          cod_amount: resolveCodAmount(order),

          total_amount: totalAmount,

          discount: discountAmount,

          quantity: order.totalItems || 1,

          // Weight
          weight: pkg.deadWeight,

          // Dimensions
          shipment_width: pkg.width,

          shipment_height: pkg.height,

          shipment_length: pkg.length,

          // Product
          products_desc:
            item.name || "Product",

          // Seller
          seller_name:
            sellerInfo.name,

          seller_add:
            sellerInfo.address,

          seller_city:
            sellerInfo.city,

          seller_state:
            sellerInfo.state,

          seller_pin:
            sellerInfo.pincode,

          seller_phone:
            sellerInfo.phone,

          gstin:
            sellerInfo.gstTin || "",

          // Return Address
          return_name:
            sellerInfo.name,

          return_add:
            sellerInfo.returnAddress,

          return_city:
            sellerInfo.returnCity,

          return_state:
            sellerInfo.returnState,

          return_pin:
            sellerInfo.returnPincode,

          return_phone:
            sellerInfo.returnPhone,

          // Optional
          waybill:
            order.awb || undefined,

          category_of_goods:
            "General"
        }
      ],

      pickup_location:
        sellerInfo.name
    };

    return payload;
  } catch (error) {
    console.error("Error creating Delhivery shipment payload:", error);
    return null;
  }
  
} 




_sanitizeDelhiveryText(value) {
  return String(value ?? '')
    .replace(/[&#%\\;]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

_normalizeDelhiveryPhone(value) {
  return String(value || '')
    .replace(/^\+91/, '')
    .replace(/\D/g, '')
    .slice(-10);
}

_extractDelhiveryRemarks(response) {
  const pkgRemarks = response?.packages?.[0]?.remarks;
  const fromPackage = Array.isArray(pkgRemarks)
    ? pkgRemarks.filter(Boolean).join('; ')
    : (pkgRemarks || '');
  const raw =
    response?.rmk ||
    response?.remark ||
    fromPackage ||
    response?.error ||
    response?.message ||
    '';
  if (typeof raw === 'boolean') return raw ? 'Delhivery shipment failed' : '';
  if (Array.isArray(raw)) return raw.filter(Boolean).join('; ');
  return String(raw || '').trim();
}

mapToDelhiveryPayload(order, sellerInfo, courierType = '') {
  order = normalizeOrderForShipment(order);
  const items = Array.isArray(order.items) ? order.items : [];
  const pkg = resolvePackageMeta(order);
  const weightInGrams = Math.max(100, Math.round((pkg.deadWeight || 0.5) * 1000));
  const firstItem = items[0] || {};
  const length = Number(pkg.length || 10) || 10;
  const breadth = Number(pkg.width || 10) || 10;
  const height = Number(pkg.height || 10) || 10;
  const isCod = isCodOrder(order);
  const amount = this._toMoney(resolveOrderAmount(order), 0);
  const phone = this._normalizeDelhiveryPhone(order.customerPhone);
  const returnPhone = this._normalizeDelhiveryPhone(sellerInfo.returnPhone || sellerInfo.phone);
  const discountAmount = resolveDiscount(order);
  const productsDesc = items.map((item) => item.name).filter(Boolean).join(', ') || 'Product';
  const productsDescWithDiscount = discountAmount > 0
    ? `${productsDesc} (Discount: Rs ${discountAmount})`
    : productsDesc;
  const hsnCode = firstItem.hsnCode || firstItem.hsn || firstItem.hsn_code || '998411';
  const sellerGst = String(sellerInfo.gstTin || '').trim();
  const validSellerGst = sellerGst && sellerGst !== '-' ? sellerGst : '';
  const shippingMode = pkg.shippingMode === 'AIR' || String(courierType || '').toLowerCase().includes('air')
    ? 'Express'
    : 'Surface';
  const address = this._sanitizeDelhiveryText(
    `${order.addressLine1 || ''} ${order.addressLine2 || ''} ${order.landmark || ''}`.trim() || order.city || ''
  );

  return {
    pickup_location: {
      // Must match the warehouse name registered with Delhivery (case-sensitive)
      name: this._sanitizeDelhiveryText(sellerInfo.name),
    },

    shipments: [
      {
        name: this._sanitizeDelhiveryText(order.customerName || 'Customer'),
        add: address,
        pin: String(order.pincode || '').replace(/\D/g, '').slice(0, 6),
        city: this._sanitizeDelhiveryText(order.city || ''),
        state: this._sanitizeDelhiveryText(order.state || ''),
        country: resolveCountry(order),
        email: order.customerEmail || '',
        phone,
        order: String(order.referenceId || order.orderNumber || ''),
        // Delhivery docs: COD or Pre-paid
        payment_mode: isCod ? 'COD' : 'Pre-paid',
        total_amount: amount,
        cod_amount: resolveCodAmount(order),
        quantity: Number(order.totalItems || items.reduce((s, i) => s + Number(i.quantity || 1), 0) || 1),
        weight: String(weightInGrams),
        shipment_length: length,
        shipment_width: breadth,
        shipment_height: height,
        products_desc: this._sanitizeDelhiveryText(productsDescWithDiscount),
        seller_name: this._sanitizeDelhiveryText(sellerInfo.name || ''),
        seller_add: this._sanitizeDelhiveryText(sellerInfo.address || ''),
        seller_inv: String(order.referenceId || order.orderNumber || ''),
        ...(validSellerGst ? { seller_gst_tin: validSellerGst } : {}),
        hsn_code: String(hsnCode),
        shipping_mode: shippingMode,
        address_type: resolveAddressTypeForCourier(order, 'delhivery'),
        return_name: this._sanitizeDelhiveryText(sellerInfo.name || ''),
        return_add: this._sanitizeDelhiveryText(sellerInfo.returnAddress || sellerInfo.address || ''),
        return_city: this._sanitizeDelhiveryText(sellerInfo.returnCity || sellerInfo.city || ''),
        return_state: this._sanitizeDelhiveryText(sellerInfo.returnState || sellerInfo.state || ''),
        return_pin: String(sellerInfo.returnPincode || sellerInfo.pincode || '').replace(/\D/g, '').slice(0, 6),
        return_phone: returnPhone,
        return_country: resolveCountry(order),
      },
    ],
  };
}

 convertToShipshadowfaxFormat(order, warehouse) {
  order = normalizeOrderForShipment(order);
  // --- Helper: safe get with default ---
  const get = (obj, path, def = '') => {
    return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined) ? acc[key] : def, obj);
  };

  // --- 1. Extract and compute base values ---
  const items = order.items || [];
  const subtotal = items.reduce((sum, it) => {
    const price = Number(it.unitPrice || 0);
    const qty = Number(it.quantity || 1);
    return sum + Math.max(0, price * qty);
  }, 0);
  const totalTax = items.reduce((sum, it) => {
    const price = Number(it.unitPrice || 0);
    const qty = Number(it.quantity || 1);
    const rate = Number(it.gstRate || 0);
    return sum + (Math.max(0, price * qty) * rate / 100);
  }, 0);
  const shipping = parseFloat(order.totalShippingPrice) || 0;
  const discounts = this._resolveOrderDiscount(order);
  const totalAmount = resolveOrderAmount(order) || (subtotal + totalTax + shipping - discounts) || 0;
  console.log({subtotal, totalTax, shipping, discounts, totalAmount}, "Computed totals for Shadowfax format",order);
  
  // Payment mode mapping
  const paymentMode = isCodOrder(order) ? 'COD' : 'Prepaid';
  const codAmount = paymentMode === 'COD' ? resolveCodAmount(order) : 0;

  // --- 2. Build customer details ---
  const customerDetails = {
    name: order.customerName || '',
    contact: Number(order.customerPhone) || '',
    address_line_1: order.addressLine1 || '',
    address_line_2: order.addressLine2 || order.landmark || '',
    city: order.city || '',    
    state: order.state || '',
    pincode: Number(order.pincode) || 0,
    alternate_contact: Number(resolveAlternatePhone(order) || order.customerPhone) || '',
    latitude: '00.0000',
    longitude: '00.0000',
    location_type: resolveAddressTypeForCourier(order, 'shadowfax')
  };
  function generateInvoiceNumber(options = {}) {
  const {
    prefix = 'INV',
    orderId = '',
    date = new Date(),
    sequence = Math.floor(Math.random() * 10000), // fallback random
    maxLength = 50
  } = options;

  // Format date as YYMMDD (e.g., 260619)
  const d = typeof date === 'string' ? new Date(date) : date;
  const dateStr = d.toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD

  // Build the base string: PREFIX-YYMMDD-ORDERID-SEQ
  let base = `${prefix}-${dateStr}`;
  if (orderId) base += `-${orderId}`;
  if (sequence !== undefined) base += `-${sequence}`;

  // If shorter than maxLength, return as is
  if (base.length <= maxLength) return base;

  // Otherwise, we need to shorten:
  // Option A: Truncate the middle, keeping prefix, date, and a hash suffix
  // Keep prefix, date, and a shortened version of orderId + sequence
  const prefixDate = `${prefix}-${dateStr}`; // e.g., INV-260619
  const remaining = maxLength - prefixDate.length - 1; // minus 1 for the dash
  if (remaining <= 2) {
    // If even prefix+date is too long, just take first maxLength chars
    return base.slice(0, maxLength);
  }

  // Create a short hash from orderId+sequence (using simple hash)
  const idSeq = `${orderId}${sequence}`;
  let hash = 0;
  for (let i = 0; i < idSeq.length; i++) {
    hash = (hash * 31 + idSeq.charCodeAt(i)) & 0xFFFFFFFF;
  }
  const shortHash = Math.abs(hash).toString(36).slice(0, remaining - 1); // take up to remaining chars

  return `${prefixDate}-${shortHash}`; // e.g., INV-260619-a3k9
}


  // --- 3. Build pickup details (warehouse) ---
  const pickupDetails = {
    name: warehouse.name || '',
    contact: Number(warehouse.phone) || '',
    address_line_1: warehouse.address || '',
    address_line_2: '',
    city: warehouse.city || '',
    state: warehouse.state || '',
    pincode: Number(warehouse.pincode) || 0,
    latitude: '00.0000',
    longitude: '00.0000',
    unique_code: warehouse.warehouseCode || 'WH001'   // fallback if no code
  };

  // --- 4. Build RTO details (return address, fallback to warehouse) ---
  const rtoDetails = {
    name: warehouse.name || '',
    contact: Number(warehouse.returnPhone) || Number(warehouse.phone) || '',
    address_line_1: warehouse.returnAddress || warehouse.address || '',
    address_line_2: '',
    city: warehouse.returnCity || warehouse.city || '',
    state: warehouse.returnState || warehouse.state || '',
    pincode: Number(warehouse.returnPincode) || Number(warehouse.pincode) || 0,
    unique_code: warehouse.rtoCode || 'RTO001'
  };

  // --- 5. Build product details ---
  const totalSubtotal = subtotal || 1; // avoid division by zero
  const productDetails = items.map((item, index) => {
    const itemSubtotal = (item.unitPrice || 0) * (item.quantity || 1);
    // Distribute total tax proportionally
    let itemTax = 0;
    if (totalTax > 0 && totalSubtotal > 0) {
      itemTax = (itemSubtotal / totalSubtotal) * totalTax;
    } else {
      // fallback: compute from item's GST rate
      itemTax = itemSubtotal * (item.gstRate || 0) / 100;
    }
    // Split tax equally into CGST and SGST (assume intra‑state)
    const cgst = itemTax / 2;
    const sgst = itemTax / 2;
    const igst = 0;

    return {
      hsn_code: item.hsnCode || '',
      invoice_no:generateInvoiceNumber({ orderId: order.referenceId }) || `INV-${index+1}`,
      sku_name: item.name || '',
      sku_id: item.sku || '',
      category: item.category || 'cosmic',
      price: Number(item.unitPrice) || 0,
      seller_details: {
        seller_name: warehouse.name || '',
        seller_address: warehouse.address || '',
        seller_state: warehouse.state || '',
        gstin_number: warehouse.gstTin || ''
      },
      taxes: {
        cgst: parseFloat(cgst.toFixed(2)),
        sgst: parseFloat(sgst.toFixed(2)),
        igst: parseFloat(igst.toFixed(2)),
        total_tax: parseFloat(itemTax.toFixed(2))
      },
      additional_details: {
        requires_extra_care: 'False',
        type_extra_care: 'Dangerous Goods',
        quantity: item.quantity || 1
      }
    };
  });

  // --- 6. Assemble final object ---
  const pkg = resolvePackageMeta(order);
  return {
    order_type: 'marketplace',
    order_details: {
      client_order_id: order.referenceId || order.shopifyOrderId || '',
      actual_weight: pkg.deadWeight,
      volumetric_weight: pkg.volumetricWeight,
      product_value: parseFloat(parseFloat(subtotal).toFixed(2)),
      payment_mode: paymentMode,
      cod_amount: resolveCodAmount(order),
      promised_delivery_date: order.expectedDeliveryDate
        ? new Date(order.expectedDeliveryDate).toISOString()
        : (order.orderDate ? new Date(order.orderDate).toISOString() : new Date().toISOString()),
      total_amount: parseFloat(totalAmount),
      discount: Number(discounts) || 0,
      shipping_charges: resolveShippingCharges(order) || Number(shipping) || 0,
      eway_bill: order.ewayBill || '',
      gstin_number: warehouse.gstTin || warehouse.gst || '',
      order_service: (pkg.shippingMode === 'AIR' || String(order.shippingMode || order.courierService || '').toLowerCase().includes('air')) ? 'air' : 'regular'
    },
    customer_details: customerDetails, 
    pickup_details: pickupDetails,
    rto_details: rtoDetails,
    product_details: productDetails
  };
}




 async createShippmentShadowfox(sourceOrder,wareid,data22,tmpindex){
    try{ 
      sourceOrder = await this._hydrateOrderForShipment(sourceOrder);
      console.log({
    'Content-Type': 'application/json',
    'Authorization':'Token '+process.env.SHADOWFAX_TOKEN
  })
              
      // if(token)
        {


         let seller = await User.findOne({
      where: { id:sourceOrder?.seller  || ""}    });  
        let warehouse_ = await Warehouse.findOne({
      where: { id:wareid  || ""}    });  
      


const sellerInfo = {
  name: warehouse_.name,
  address: warehouse_.address,
  city: warehouse_.city,
  state: warehouse_.state,
  pincode: warehouse_?.pincode|| 122001,
  phone: warehouse_.phone,
  gstTin: warehouse_.gst || "",
  returnAddress:warehouse_.address,
  returnCity: warehouse_.city,
  returnState: warehouse_.state,
  returnPincode: warehouse_.pincode,
  returnPhone: warehouse_.phone
};


                   

        const convertedOrder=this.convertToShipshadowfaxFormat(sourceOrder,sellerInfo,data22,tmpindex)



         console.log(JSON.stringify(convertedOrder),"shadowfaxconvertedorder")                      
        let response=await fetch('https://dale.shadowfax.in/api/v3/clients/orders/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization':'Token '+process.env.SHADOWFAX_TOKEN
  },
  body: JSON.stringify(convertedOrder)
})
response=await response.json()
 console.log(JSON.stringify(response),"shadowfaxresponse",convertedOrder)
if(response?.data?.awb_number){
 const newShipment = await Shipment.create({
      referenceId: sourceOrder.referenceId,
      shipmentjson: convertedOrder || null,
      shipmenttracking:response || null                                                      
    });
  }
   return response                            
      }
     
    }
    catch(e){
      console.log(e,"shadowfaxerror")
      return {message:"Error creating shipment"}
    }

        

   
  }

  getAccountDetails(weight, zone) {
         zone = zone.toUpperCase();   
 
   if (weight <= 1.5) {
     return "da50254801b44a48044cd8cd1b680878bfe794ca";
   }
 
   if (weight >1.5 && weight <= 4) {
     return "34cad456d4682e13f334f92b3f15c9446fe4a585";
   }
 
   if (weight >4 && weight <= 9) { 
     if (["C", "D", "E"].includes(zone)) {
       return "34cad456d4682e13f334f92b3f15c9446fe4a585";
     }
 
     if (["A", "B"].includes(zone)) {
       return "96ca090a0efe86568d0da57ed11421ed302386a1";
     }
   }
 
   if (weight > 9) {
     return "96ca090a0efe86568d0da57ed11421ed302386a1";
   }
 
   return null;
   }
 

  async createShippmentDelhivery(sourceOrder, wareid, data22, tmpindex,xind) {
     try {
       sourceOrder = await this._hydrateOrderForShipment(sourceOrder);
 
       const warehouse_ = await Warehouse.findOne({
         where: { id: wareid || "" }
       });
 
       if (!warehouse_) {
         return { success: false, message: "Warehouse not found for Delhivery shipment", packages: [] };
       }
 
       const seller = await User.findByPk(sourceOrder?.seller || null);
       const sellerGst = String(seller?.gst || warehouse_?.gst || "").trim();
 
       const sellerInfo = {
         name: warehouse_.name,
         address: warehouse_.address,
         city: warehouse_.city,
         state: warehouse_.state,
         pincode: warehouse_?.pincode || 122001,
         phone: warehouse_.phone,
         gstTin: sellerGst && sellerGst !== "-" ? sellerGst : "",
         returnAddress: warehouse_.address,
         returnCity: warehouse_.city,
         returnState: warehouse_.state,
         returnPincode: warehouse_.pincode,
         returnPhone: warehouse_.phone
       };
 
       const courierType =
         data22?.ratelist?.[sourceOrder.referenceId]?.type?.[tmpindex] ||
         data22?.ratelist?.[sourceOrder.referenceId]?.type?.[data22?.coureir?.[tmpindex]] ||
         "";
 
       const convertedOrder = this.mapToDelhiveryPayload(sourceOrder, sellerInfo, courierType);
       const shipment = convertedOrder?.shipments?.[0] || {};
 
 
      
 


 
 
 let tokendel=this.getAccountDetails(Number(shipment.weight || 0) / 1000, String(data22?.zone[xind] || "").replaceAll("ZONE ", "").toUpperCase());
 

 console.log(tokendel,"tokennnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn",Number(shipment.weight || 0),String(data22?.zone[xind] || "").replaceAll("ZONE ", "").toUpperCase(),data22,xind)
 

 
 
       if (!shipment.phone || shipment.phone.length !== 10) {
         return {
           success: false,
           message: "Invalid customer phone for Delhivery (need 10 digits)",
           packages: []
         };
       }
       if (!shipment.pin || String(shipment.pin).length !== 6) {
         return {
           success: false,
           message: "Invalid pincode for Delhivery (need 6 digits)",
           packages: []
         };
       }
       if (!shipment.add) {
         return {
           success: false,
           message: "Customer address is required for Delhivery shipment",
           packages: []
         };
       }
       if (!convertedOrder?.pickup_location?.name) {
         return {
           success: false,
           message: "Warehouse name is required and must match Delhivery pickup location",
           packages: []
         };
       }
 
      //  console.log(JSON.stringify(convertedOrder), "Delhivery Payload");
       const formBody = new URLSearchParams();
       formBody.append("format", "json");
       formBody.append("data", JSON.stringify(convertedOrder));
                      
       const httpResponse = await fetch(
         "https://track.delhivery.com/api/cmu/create.json",
         {
           method: "POST",
           headers: {
             Authorization: `Token ${tokendel}`,
             "Content-Type": "application/x-www-form-urlencoded"
           },
           body: formBody.toString()
         }
       );

       console.log(httpResponse,"httpResponsehttpResponsehttpResponse")
 
       const responseText = await httpResponse.text();
       let response;





       try {
         response = JSON.parse(responseText);
      
         return response;
       } catch (_) {
         console.error("Delhivery non-JSON response:", httpResponse.status, responseText?.slice?.(0, 500));
         return {
           success: false,
           message: `Delhivery API error (HTTP ${httpResponse.status}): ${String(responseText || "").slice(0, 200) || "invalid response"}`,
           packages: []
         };
       }
 
      //  console.log(response, "Delhivery Response");
 
       const waybill = response?.packages?.[0]?.waybill || response?.packages?.[0]?.wbn || null;
       const remarks = this._extractDelhiveryRemarks(response);
 
       if (waybill) {
         await Shipment.create({
           referenceId: sourceOrder.referenceId,
           shipmentjson: convertedOrder || null,
           shipmenttracking: response || null
         });
       } else {
         console.error("Delhivery shipment failed:", remarks || response);
       }
 
       return {
         ...response,
         packages: response?.packages || [],
         success: !!waybill,
         message: waybill
           ? "Shipment created successfully"
           : (remarks || `Delhivery shipment failed (HTTP ${httpResponse.status})`),
       };
     } catch (e) {
       console.log(e, "Delhivery Error");
       return {
         success: false,
         message: "Error creating shipment: " + (e.message || "unknown"),
         packages: [],
         error: e.message
       };    
     }
   }   
  async createShippmentXpressbees(sourceOrder, wareid, data22, tmpindex) {
    try {
      sourceOrder = await this._hydrateOrderForShipment(sourceOrder);
      const warehouse_ = await Warehouse.findOne({
        where: { id: wareid || "" }
      });

      const result = await xpressbeesService.createShipment(sourceOrder, warehouse_);
      console.log(result, "Xpressbees create response");

      if (result.success && result.awb) {
        await Shipment.create({
          referenceId: sourceOrder.referenceId,
          shipmentjson: result.payload || null,
          shipmenttracking: result.data || null
        });
      }

      return result;
    } catch (e) {
      console.log(e, "Xpressbees Error");
      return { success: false, message: "Error creating Xpressbees shipment" };
    }
  }

  async createShippmentBlueDart(sourceOrder, wareid, data22, tmpindex) {
    try {
      sourceOrder = await this._hydrateOrderForShipment(sourceOrder);
      const warehouse_ = await Warehouse.findOne({
        where: { id: wareid || "" }
      });

      if (!warehouse_) {
        return { success: false, message: "Warehouse not found for BlueDart shipment" };
      }

      const seller = await User.findByPk(sourceOrder?.seller || null);
      const warehousePayload = {
        ...(typeof warehouse_.toJSON === "function" ? warehouse_.toJSON() : warehouse_),
        gstTin: String(seller?.gst || warehouse_?.gst || "").trim(),
        email: seller?.email || "",
        returnAddress: warehouse_.address,
        returnCity: warehouse_.city,
        returnState: warehouse_.state,
        returnPincode: warehouse_.pincode,
        returnPhone: warehouse_.phone,
      };

      const courierName =
        data22?.ratelist?.[sourceOrder.referenceId]?.type?.[data22?.coureir?.[tmpindex]] ||
        "";

      const result = await bluedartService.createShipment(sourceOrder, warehousePayload, courierName);
      console.log(result, "BlueDart create response");

      if (result.success && result.awb) {
        await Shipment.create({
          referenceId: sourceOrder.referenceId,
          shipmentjson: result.payload || null,
          shipmenttracking: result.data || null
        });
      }

      return result;
    } catch (e) {
      console.log(e, "BlueDart Error");
      return { success: false, message: "Error creating BlueDart shipment" };
    }
  }





async cancelshipment(referenceId) {
  try {
   

    console.log({ referenceId: referenceId || "" })
     const Orderr = await Order.findOne({
      where: { referenceId: referenceId || "" },
      include: [{
    model: OrderItem,
    as: 'items',
  }]
    });
    



    // console.log({ referenceId: referenceId || "" },Orderr.courier)

    const courierType = Orderr.courier ||"delhivery";



    // console.log(Orderr,"OrderrOrderrOrderrOrderrOrderrOrderrOrderr")
    // return 



    //  if(Orderr.status=="Processing")
      
      
      
      {
     





    
    if (courierType === 'eKART' || courierType === 'Ekart' || courierType.toLowerCase().includes('ekart')) {
      if (!shipment?.shipmenttracking?.tracking_id) {
        return { message: "No tracking ID found for eKART shipment" };
      }
      
      const tokenData = await this.getekarttoken();
      const access_token = tokenData?.access_token || tokenData?.data?.access_token || tokenData?.token;
      
      if (!access_token) {
        return { message: "Failed to get eKART token" };
      }
      
      const payload = {
        request_id: `cancel_${Date.now()}`,
        request_details: [
          {
            tracking_id: shipment.shipmenttracking.tracking_id,
            reason: "Customer requested cancellation"
          }
        ]
      };
      
      
      let response = await fetch('https://app.elite.ekartlogistics.in/api/v1/package/cancel?tracking_id=' + shipment.shipmenttracking.tracking_id, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + access_token
        }
      });
      
      response = await response.json();
      console.log(response, "eKART cancellation response");
      
      if (response.status === true) {
        await Shipment.update(
          {
            shipmenttracking: response
          },
          {
            where: { referenceId: referenceId }
          }
        );
        
        await Order.update(
          {
            status: "Cancelled",
            cancelledAt: new Date(),
            cancelReason: 'Customer requested cancellation',
          },
          {
            where: { referenceId: referenceId }
          }
        );
       
              const user = await User.findByPk(Orderr.seller);



              const waaa=await Wallet.findOne({where:{transid:Orderr.awb}})





const data = await Wallet.create({
 
  user_id:Orderr.seller,
status:"Refund",
description:"Shipment created with SMC. AWB: "+ response?.data?.awbNumber,
 
amount:this._roundMoney(this._toMoney(waaa.amount, 0)),
transid:Orderr.awb,
referenceId:Orderr.referenceId,
}
);

const newBalance = this._roundMoney(this._toMoney(user.walletBalance, 0) + this._toMoney(waaa.amount, 0));
      await User.update(
        { walletBalance: newBalance },
        { where: { id: Orderr.seller } }
      );




        
        return { message: "referenceId. " + referenceId + " cancelled successfully" };
      } else {
        return { message: response.message || "Failed to cancel eKART shipment" };
      }
    }
    else if (courierType.toLowerCase().includes('smc')) {
      if (!Orderr?.awb) {
        return { message: "No AWB found for Innufill shipment" };
      }

      const shipment = await Shipment.findOne({ where: { referenceId } });
      const innofulfillOrderId = innofulfillService.resolveExternalOrderId(Orderr, shipment);

      if (!innofulfillOrderId) {
        return {
          message:
            "InnoFulfill orderId not found for this shipment. Cancel requires V2 orderId stored at booking time."
        };
      }

      const response = await innofulfillService.cancelOrders({
        orderId: innofulfillOrderId,
        reason: "Customer requested cancellation"
      });
      console.log(response, "Innufill cancellation response");

      if (response.status === 200 || response.success === true) {
        await Shipment.update(
          {
            shipmenttracking: response
          },
          {
            where: { referenceId: referenceId }
          }
        );
        
        await Order.update(
          {
            status: "Cancelled",
            cancelledAt: new Date(),
            cancelReason: 'Customer requested cancellation',
          },
          {
            where: { referenceId: referenceId }
          }
        );
        


          const user = await User.findByPk(Orderr.seller);



              const waaa=await Wallet.findOne({where:{transid:Orderr.awb}})





const data = await Wallet.create({
 
  user_id:Orderr.seller,
status:"Refund",
description:"Shipment created with SMC. AWB: "+ response?.data?.awbNumber,
 
amount:this._roundMoney(this._toMoney(waaa.amount, 0)),
transid:Orderr.awb,
referenceId:Orderr.referenceId,
}
);

const newBalance = this._roundMoney(this._toMoney(user.walletBalance, 0) + this._toMoney(waaa.amount, 0));
      await User.update(
        { walletBalance: newBalance },
        { where: { id: Orderr.seller } }
      );



        return { message: "referenceId " + referenceId + " cancelled successfully" };
      } else {
        return { message: response.message || "Failed to cancel Innufill shipment" };
      }
    }


     else if (courierType.toLowerCase().includes('delhivery')) {





 const totalWeightKG = Orderr.items.reduce((sum, item) => {
    return sum + Number(item.deadWeight || 0) * Number(item.quantity || 1);
  }, 0);

  // Delhivery create API expects weight in grams
  const weightInGrams = Math.max(100, Math.round((totalWeightKG || 0.5) * 1000));




      let deltoken=this.getAccountDetails(weightInGrams / 1000, String(Orderr?.zone || "").replaceAll("ZONE ", "").toUpperCase());




     

      if (!Orderr?.awb) {
        return { message: "No AWB found for Delhivery shipment" };
      }
        let response = await fetch(
      "https://track.delhivery.com/api/p/edit",
      {
        method: "POST",

        headers: {
          Accept: "application/json",
          Authorization: `Token ${deltoken}`,
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          waybill: Orderr?.awb,
          cancellation: "true"
        })
      }
    );

      
    
      
   console.log(response, "Delhivery cancellation response");
      
      if (response.ok) {


console.log(response, "Delhivery cancellation response JSON");


        await Shipment.update(
          {
            shipmenttracking: response
          },
          {
            where: { referenceId: referenceId }
          }
        );










        
        await Order.update(
          {
            status: "Cancelled",
            cancelledAt: new Date(),
            cancelReason: 'Customer requested cancellation',
          },
          {
            where: { referenceId: referenceId }
          }
        );




          const user = await User.findByPk(Orderr.seller);



              const waaa=await Wallet.findOne({where:{transid:Orderr.awb}})





const data = await Wallet.create({
 
  user_id:Orderr.seller,
status:"Refund",
description:"Shipment created with SMC. AWB: "+ response?.data?.awbNumber,
 
amount:this._roundMoney(this._toMoney(waaa.amount, 0)),
transid:Orderr.awb,
referenceId:Orderr.referenceId,
}
);

const newBalance = this._roundMoney(this._toMoney(user.walletBalance, 0) + this._toMoney(waaa.amount, 0));
      await User.update(
        { walletBalance: newBalance },
        { where: { id: Orderr.seller } }
      );

        
        return { message: "Order no. " + referenceId + " cancelled successfully" };
      } else {
        return { message: response.message || "Failed to cancel Innufill shipment" };
      }
    }
    else if (courierType.toLowerCase().includes('shadowfax')) {
      if (!Orderr?.awb) {
        return { message: "No AWB found for Delhivery shipment" };
      }
        let response = await fetch(
      "https://dale.shadowfax.in/api/v3/clients/orders/cancel/",
      {
        method: "POST", 

        headers: {
          Authorization: `Token ${process.env.SHADOWFAX_TOKEN}`,
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          request_id: Orderr?.awb,
          "cancel_remarks": "Request cancelled by customer"                  
        })
      }     
    ); 

      
    
      
  // console.log(response, "Delhivery cancellation response");
      
      if (response.ok) {
        await Shipment.update(
          {
            shipmenttracking: response
          },
          {
            where: { referenceId: referenceId }
          }
        );










        
        await Order.update(
          {
            status: "Cancelled",
            cancelledAt: new Date(),
            cancelReason: 'Customer requested cancellation',
          },
          {
            where: { referenceId: referenceId }
          }
        );




          const user = await User.findByPk(Orderr.seller);



              const waaa=await Wallet.findOne({where:{transid:Orderr.awb}})





const data = await Wallet.create({
 
  user_id:Orderr.seller,
status:"Refund",
description:"Shipment created with SMC. AWB: "+ response?.data?.awbNumber,
 
amount:this._roundMoney(this._toMoney(waaa.amount, 0)),
transid:Orderr.awb,
referenceId:Orderr.referenceId,
}
);

const newBalance = this._roundMoney(this._toMoney(user.walletBalance, 0) + this._toMoney(waaa.amount, 0));
      await User.update(
        { walletBalance: newBalance },
        { where: { id: Orderr.seller } }
      );

        
        return { message: "referenceId " + referenceId + " cancelled successfully" };
      } else {
        return { message: response.message || "Failed to cancel Innufill shipment" };
      }
    }







    else if (String(courierType).toLowerCase().includes('xpressbees') || String(courierType).toLowerCase().includes('xpress bees')) {
      if (!Orderr?.awb || Orderr.awb === '-') {
        return { message: "No AWB found for Xpressbees shipment" };
      }

      const xbCancel = await xpressbeesService.cancelShipment(Orderr.awb);
      console.log(xbCancel, "Xpressbees cancellation response");

      if (xbCancel.success) {
        await Shipment.update(
          { shipmenttracking: xbCancel.data || xbCancel },
          { where: { referenceId: referenceId } }
        );

        await Order.update(
          {
            status: "Cancelled",
            cancelledAt: new Date(),
            cancelReason: 'Customer requested cancellation',
          },
          { where: { referenceId: referenceId } }
        );

        const userXb = await User.findByPk(Orderr.seller);
        const waaaXb = await Wallet.findOne({ where: { transid: Orderr.awb } });

        await Wallet.create({
          user_id: Orderr.seller,
          status: "Refund",
          description: "Shipment cancelled with Xpressbees. AWB: " + Orderr.awb,
          amount: this._roundMoney(this._toMoney(waaaXb?.amount, 0)),
          transid: Orderr.awb,
          referenceId: Orderr.referenceId
        });

        if (userXb && waaaXb) {
          await User.update(
            { walletBalance: this._roundMoney(this._toMoney(userXb.walletBalance, 0) + this._toMoney(waaaXb.amount, 0)) },
            { where: { id: Orderr.seller } }
          );
        }

        return { message: "referenceId " + referenceId + " cancelled successfully" };
      }

      return { message: xbCancel.message || "Failed to cancel Xpressbees shipment" };
    }

    else if (
      String(courierType).toLowerCase().includes('bluedart') ||
      String(courierType).toLowerCase().includes('blue dart')
    ) {
      if (!Orderr?.awb || Orderr.awb === '-') {
        return { message: "No AWB found for BlueDart shipment" };
      }

      const bdCancel = await bluedartService.cancelShipment(Orderr.awb);
      console.log(bdCancel, "BlueDart cancellation response");

      if (bdCancel.success) {
        await Shipment.update(
          { shipmenttracking: bdCancel.data || bdCancel },
          { where: { referenceId: referenceId } }
        );

        await Order.update(
          {
            status: "Cancelled",
            cancelledAt: new Date(),
            cancelReason: 'Customer requested cancellation',
          },
          { where: { referenceId: referenceId } }
        );

        const userBd = await User.findByPk(Orderr.seller);
        const waaaBd = await Wallet.findOne({ where: { transid: Orderr.awb } });

        await Wallet.create({
          user_id: Orderr.seller,
          status: "Refund",
          description: "Shipment cancelled with BlueDart. AWB: " + Orderr.awb,
          amount: this._roundMoney(this._toMoney(waaaBd?.amount, 0)),
          transid: Orderr.awb,
          referenceId: Orderr.referenceId
        });

        if (userBd && waaaBd) {
          await User.update(
            { walletBalance: this._roundMoney(this._toMoney(userBd.walletBalance, 0) + this._toMoney(waaaBd.amount, 0)) },
            { where: { id: Orderr.seller } }
          );
        }

        return { message: "referenceId " + referenceId + " cancelled successfully" };
      }

      return { message: bdCancel.message || "Failed to cancel BlueDart shipment" };
    }

    else {
      return { message: "Unsupported courier type: " + courierType };
    }
    
  }
    
  } catch (error) {
    console.error("Cancel shipment error:", error);
    return { message: error.message };
  }
  
}

async getekarttoken() {
  try {
    let response = await fetch(
      'https://app.elite.ekartlogistics.in/integrations/v2/auth/token/EKART_6995807edcc54747b4c875ac',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: process.env.EKART_USERNAME || "",
          password: process.env.EKART_PASSWORD || ""
        })
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.log("TOKEN ERROR:", err.message);
    return null;
  }
}

async  getToken(tmpdata) {
  console.log(tmpdata,"tmpdatadsdksjdk")
  const shopp = String(tmpdata.storeUrl || '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '')
    .replace(/\.myshopify\.com.*/i, '')
    .split('/')[0]
    .replace(/\s+/g, '');

  const clientId = tmpdata.clientid || tmpdata.clientId;
  const clientSecret = tmpdata.accessToken || tmpdata.clientSecret;

  const response = await fetch(
    `https://${shopp}.myshopify.com/admin/oauth/access_token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    }
  );

  if (!response.ok) throw new Error(`Token request failed: ${response.status}`);

  const { access_token } = await response.json();
  return access_token;
}

async fulfillOrder(order, awb, courer) {
  const { fulfillShopifyOrder } = require('./shopifyFulfillment');
  try {
    return await fulfillShopifyOrder(order, { awb, courier: courer });
  } catch (e) {
    console.log(e, "fulfillordererror");
    return { success: false, error: e.message };
  }
}

/**
 * Mirror the current order status / AWB / courier to Shopify (non-blocking).
 * Shopify has no event for every LogixMitra status, so the nearest fulfillment
 * event (and order tag for RTO/NDR) is pushed instead - see services/shopifyFulfillment.js.
 */
syncShopifyOrder(order) {
  if (!order) return;
  if (String(order.platform || '').toLowerCase() !== 'shopify') return;
  const awb = String(order.awb || '').trim();
  if (!awb || awb === '-') return;
  Promise.resolve()
    .then(() => this.fulfillOrder(order))
    .then((result) => {
      if (result?.skipped) {
        console.log(`[shopify] ${order.referenceId} status push skipped: ${result.reason}`);
      }
    })
    .catch((err) => {
      console.warn(`[shopify] ${order.referenceId} status push failed:`, err?.message || err);
    });
}
/**
 * Same as syncShopifyOrder but reloads the order first (used by cancel flows,
 * where the status is written with Order.update and the local instance is stale).
 */
syncShopifyOrderByReference(referenceId, statusOverride = null) {
  if (!referenceId) return;
  Promise.resolve()
    .then(() => Order.findOne({ where: { referenceId } }))
    .then((fresh) => {
      if (!fresh) return;
      if (statusOverride) fresh.set('status', statusOverride);
      this.syncShopifyOrder(fresh);
    })
    .catch((err) =>
      console.warn(`[shopify] ${referenceId} status push failed:`, err?.message || err)
    );
}



_toMoney(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const cleaned = String(value).replace(/[^0-9.-]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : fallback;
}

_roundMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Number(n.toFixed(2));
}

/** Resolve order discount from totalDiscounts or discountCodes sum */
_resolveOrderDiscount(order = {}) {
  const direct = this._toMoney(order.totalDiscounts, 0);
  if (direct > 0) return this._roundMoney(direct);

  const codes = Array.isArray(order.discountCodes) ? order.discountCodes : [];
  const fromCodes = codes.reduce((sum, code) => sum + this._toMoney(code?.amount, 0), 0);
  return this._roundMoney(Math.max(0, fromCodes));
}

/**
 * Ensure courier payloads get discount/shipping/items from DB when bulk payload omits them.
 */
async _hydrateOrderForShipment(sourceOrder) {
  if (!sourceOrder) return sourceOrder;
  try {
    const where = sourceOrder.referenceId
      ? { referenceId: sourceOrder.referenceId }
      : sourceOrder.id
        ? { id: sourceOrder.id }
        : null;
    if (!where) return sourceOrder;

    const dbOrder = await Order.findOne({
      where,
      include: [{ model: OrderItem, as: 'items' }],
    });
    if (!dbOrder) return sourceOrder;

    const plain = typeof dbOrder.toJSON === 'function' ? dbOrder.toJSON() : dbOrder;
    const merged = {
      ...plain,
      ...sourceOrder,
      totalDiscounts:
        this._toMoney(sourceOrder.totalDiscounts, null) ??
        this._toMoney(plain.totalDiscounts, 0),
      discountCodes:
        (Array.isArray(sourceOrder.discountCodes) && sourceOrder.discountCodes.length > 0)
          ? sourceOrder.discountCodes
          : (plain.discountCodes || []),
      totalShippingPrice:
        this._toMoney(sourceOrder.totalShippingPrice, null) ??
        this._toMoney(plain.totalShippingPrice, 0),
      subtotalPrice:
        this._toMoney(sourceOrder.subtotalPrice, null) ??
        this._toMoney(plain.subtotalPrice, 0),
      items:
        (Array.isArray(sourceOrder.items) && sourceOrder.items.length > 0)
          ? sourceOrder.items
          : (plain.items || []),
    };
    merged.totalDiscounts = this._resolveOrderDiscount(merged);
    return normalizeOrderForShipment(merged);
  } catch (e) {
    console.log(e, 'hydrateOrderForShipment');
    return normalizeOrderForShipment({
      ...sourceOrder,
      totalDiscounts: this._resolveOrderDiscount(sourceOrder),
    });
  }
}

_extractCodChargeFromRateCard(rateCardEntry, amountNum) {
  try {
    // Accept either the courier row array itself, or { data: [...] }
    const dataRows = Array.isArray(rateCardEntry)
      ? rateCardEntry
      : Array.isArray(rateCardEntry?.data)
        ? rateCardEntry.data
        : [];
    const lastRow = String(dataRows.at(-1) || '');
    if (!lastRow) return 0;
    // Rate chart COD cell looks like "40|2%" or "40 | 2 %"
    const parts = lastRow.replaceAll(' ', '').replaceAll('%', '').split('|');
    if (parts.length < 2) return 0;
    const minCod = this._toMoney(parts[0], 0);
    const codPercent = this._toMoney(parts[1], 0);
    if (minCod <= 0 && codPercent <= 0) return 0;
    const percentCharge = this._roundMoney((amountNum * codPercent) / 100);
    return this._roundMoney(Math.max(percentCharge, minCod));
  } catch (_) {
    return 0;
  }
}

_resolveShipmentGstPercent(rateEntry, selectedIndex) {
  const defaultGst = this._toMoney(process.env.SHIPMENT_GST_PERCENT, 18);
  const selectedGst =
    this._toMoney(rateEntry?.gst?.[selectedIndex], null) ??
    this._toMoney(rateEntry?.gst, null) ??
    defaultGst;
  const gstIncludedFlag = String(
    rateEntry?.gstIncluded ??
    rateEntry?.gst_included ??
    ''
  ).toLowerCase();
  if (gstIncludedFlag === 'true' || gstIncludedFlag === 'yes' || gstIncludedFlag === '1') {
    return 0;
  }
  return Math.max(0, selectedGst);
}

  async createbulkshipment(payload){

    let storeforcheck=[] 
    try{
    let data_=payload.data.orderlist
    
    let data22=payload.data
    
            for(let x in data_){

              let tmpod=data_[x]

              const existingOrder = await Order.findOne({
                where: { referenceId: tmpod?.referenceId || "" },
                attributes: ['id', 'status', 'referenceId']
              });
              const statusText = String(existingOrder?.status || tmpod?.status || '').toLowerCase();
              if (statusText.includes('rto') || statusText.includes('return to origin')) {
                storeforcheck.push({
                  message: (tmpod?.referenceId || '') + '->Courier cannot be assigned to RTO orders'
                });
                continue;
              }


              const shipment = await Shipment.count({ 
      where: { referenceId:tmpod?.referenceId || "" }    });

      if(shipment<1)
        {
    
  let amountNum = this._toMoney(tmpod.amount, 0);
  let charge=0
              
 
              




              const user = await User.findByPk(tmpod.seller);
              const rateEntry = data22?.ratelist?.[tmpod.referenceId];
              const selectedIndex = data22?.coureir?.[x];
              const baseRate = this._toMoney(rateEntry?.rate?.[selectedIndex], 0);
              charge += baseRate;
              let codCharge = 0;

         console.log(charge,"aslklksa asldkdlk saldkl",tmpod?.financialStatus, "pending")
 
      // if(tmpod.financialStatus == "pending"){
      //     codCharge = this._extractCodChargeFromRateCard(rateEntry?.data?.[selectedIndex], amountNum);
      //     charge += codCharge;
      //   }
        const gstPercent = this._resolveShipmentGstPercent(rateEntry, selectedIndex);
      //   const gstAmount = this._roundMoney((charge * gstPercent) / 100);
      //   charge += gstAmount;
      //   charge = this._roundMoney(charge);
      //   // Reverse freight + GST only (no COD) — used for auto RTO wallet debit
        const rtoCharge = this._roundMoney(baseRate + (baseRate * gstPercent) / 100);
      
        // charge=charge*1.18



       

        console.log(charge,user.walletBalance,"sadksadjksajd asdksajdk")




        console.log(data22.ratelist[tmpod.referenceId].type[data22.coureir[x]].toLowerCase().includes("shadowfax"),
 (payload.data.orderlist[x].platform=="Manual" || payload.data.orderlist[x].platform=="Merged" || payload.data.orderlist[x].platform=="Shopify" || payload.data.orderlist[x].platform=="WooCommerce") , charge<=user.walletBalance)


                
 
  if(data22.ratelist[tmpod.referenceId].type[data22.coureir[x]].toLowerCase().includes("ekart") && payload.data.orderlist[x].platform=="Shopify" && charge<=user.walletBalance){


    
    let response =await this.createShippmentekart(payload.data.orderlist[x],payload.data.warehouselist[x],data22)


               
     

if(response?.tracking_id!=undefined && response?.tracking_id!=null){
    await Order.update(
  {
    courier: data22.ratelist[tmpod.referenceId].type[data22.coureir[x]] || null,
    status: (response?.barcodes?.wbn || response?.tracking_id) ? "READY FOR DISPATCH" : payload.data.orderlist[x].status,
    awb: response?.barcodes?.wbn || null,
    orderDate:data22.dispatchdate[tmpod.referenceId] || tmpod.orderDate || tmpod.processedAt,
    processedAt:data22.dispatchdate[tmpod.referenceId] || tmpod.orderDate || tmpod.processedAt,
    warehouse:payload.data.warehouselist[x],
    chargecor:charge,
    rtoCharge,
    zone:payload.data.zone[x]
  },
  {
    where: { referenceId: payload.data.orderlist[x].referenceId }
  }

);
await this.fulfillOrder(tmpod,response?.barcodes?.wbn,data22.ratelist[tmpod.referenceId].type[data22.coureir[x]] || null)

const newBalance = this._roundMoney(this._toMoney(user.walletBalance, 0) - charge);
      await User.update(
        { walletBalance: newBalance },
        { where: { id: tmpod.seller } }
      );

      




  const data = await Wallet.create({

  user_id:tmpod.seller,
status:"Debited", 
description:"Shipment created with eKART. AWB: "+ response?.tracking_id,
amount:this._roundMoney(charge),
transid:response?.tracking_id,
referenceId:tmpod.referenceId,
}
);


  

}


  storeforcheck.push({message:response?.tracking_id!=undefined&&response?.tracking_id!=null?response.remark:response.description})






    }
 else if(data22.ratelist[tmpod.referenceId].type[data22.coureir[x]].toLowerCase().includes("smc") && payload.data.orderlist[x].platform=="Shopify" && charge<=user.walletBalance){


  
let response=await this.createShippmentinnufill(payload.data.orderlist[x],payload.data.warehouselist[x],data22,x)


console.error(response,response?.data,"innufill response")
try{
if(response?.data?.awbNumber!=undefined && response?.data?.awbNumber!=null){



  await Order.update(
  {
    courier: data22.ratelist[tmpod.referenceId].type[data22.coureir[x]]|| null,
    status: response?.data?.awbNumber ? "READY FOR DISPATCH" : payload.data.orderlist[x].status,
    awb: response?.data?.awbNumber || null,
    trackingnumber: response?.data?.orderId || null,
    orderDate:data22.dispatchdate[tmpod.referenceId] || tmpod.orderDate || tmpod.processedAt,
processedAt:data22.dispatchdate[tmpod.referenceId] || tmpod.orderDate || tmpod.processedAt,
    warehouse:payload.data.warehouselist[x],
     chargecor:charge,
    rtoCharge,
    zone:payload.data.zone[x] 

 
  },
  {
    where: { referenceId: payload.data.orderlist[x].referenceId }
  }

);
await this.fulfillOrder(tmpod,response?.data?.awbNumber,data22.ratelist[tmpod.referenceId].type[data22.coureir[x]] || null)

const newBalance = this._roundMoney(this._toMoney(user.walletBalance, 0) - charge);
      await User.update(
        { walletBalance: newBalance },
        { where: { id: tmpod.seller } }
      );

      




  const data = await Wallet.create({

  user_id:tmpod.seller,
status:"Debited",
description:"Shipment created with SMC. AWB: "+ response?.data?.awbNumber, 
 
amount:this._roundMoney(charge),
transid:response?.data?.awbNumber,
referenceId:tmpod.referenceId,
}
);


  

}
}
catch(e){
  console.log(e,"innufill error")
}


  storeforcheck.push({message:response?.status==200?payload.data.orderlist[x].referenceId+"->"+"Order received successfully":payload.data.orderlist[x].referenceId+"->"+response.message})
 }
 else if(data22.ratelist[tmpod.referenceId].type[data22.coureir[x]].toLowerCase().includes("smc") && payload.data.orderlist[x].platform=="WooCommerce" && charge<=user.walletBalance)
  {
            
          
let response=await this.createShippmentinnufill(payload.data.orderlist[x],payload.data.warehouselist[x],data22,x)

// await this.fulfillOrder(tmpod,response?.data?.awbNumber)

if(response?.data?.awbNumber!=undefined && response?.data?.awbNumber!=null){

  await Order.update(
  {
    courier: data22.ratelist[tmpod.referenceId].type[data22.coureir[x]] || null,
    status: response?.data?.awbNumber ? "READY FOR DISPATCH" : payload.data.orderlist[x].status,
    awb: response?.data?.awbNumber || null,
    trackingnumber: response?.data?.orderId || null,
    orderDate:data22.dispatchdate[tmpod.referenceId] || tmpod.orderDate || tmpod.processedAt,
processedAt:data22.dispatchdate[tmpod.referenceId] || tmpod.orderDate || tmpod.processedAt,
    warehouse:payload.data.warehouselist[x],
     chargecor:charge,
    rtoCharge,
    zone:payload.data.zone[x]


  },
  {
    where: { referenceId: payload.data.orderlist[x].referenceId }
  }

);
const newBalance = this._roundMoney(this._toMoney(user.walletBalance, 0) - charge);
      await User.update(
        { walletBalance: newBalance },
        { where: { id: tmpod.seller } }
      );

      




  const data = await Wallet.create({

  user_id:tmpod.seller,
status:"Debited",
description:"Shipment created with SMC. AWB: "+ response?.data?.awbNumber, 

amount:this._roundMoney(charge),
transid:response?.data?.awbNumber,
referenceId:tmpod.referenceId,
}
);


  

}
  storeforcheck.push({message:response?.status==200?payload.data.orderlist[x].referenceId+"->"+"Order received successfully":payload.data.orderlist[x].referenceId+"->"+response.message})
    
    
    // storeforcheck.push({message:"Invalid courier or platform for order "+payload.data.orderlist[x].orderNumber})
 }
 else if(data22.ratelist[tmpod.referenceId].type[data22.coureir[x]].toLowerCase().includes("ekart") && payload.data.orderlist[x].platform=="WooCommerce" && charge<=user.walletBalance){

 let response =await this.createShippmentekart(payload.data.orderlist[x],payload.data.warehouselist[x],data22)
               
// await this.fulfillOrder(tmpod,response?.barcodes?.wbn)


if(response?.tracking_id!=undefined && response?.tracking_id!=null){

    await Order.update(
  {
    courier: data22.ratelist[tmpod.referenceId].type[data22.coureir[x]] || null,
    status: response?.barcodes?.wbn || response?.tracking_id ? "READY FOR DISPATCH" : payload.data.orderlist[x].status,
    awb: response?.barcodes?.wbn || null,
    orderDate:data22.dispatchdate[tmpod.referenceId] || tmpod.orderDate || tmpod.processedAt,
processedAt:data22.dispatchdate[tmpod.referenceId] || tmpod.orderDate || tmpod.processedAt,
    warehouse:payload.data.warehouselist[x],
     chargecor:charge,
    rtoCharge,
    zone:payload.data.zone[x]


  },
  {
    where: { referenceId: payload.data.orderlist[x].referenceId }
  }

);
const newBalance = this._roundMoney(this._toMoney(user.walletBalance, 0) - charge);
      await User.update(
        { walletBalance: newBalance },
        { where: { id: tmpod.seller } }
      );

      




  const data = await Wallet.create({

  user_id:tmpod.seller,
status:"Debited",
amount:this._roundMoney(charge),
transid:response?.tracking_id,
referenceId:tmpod.referenceId,
description:"Shipment created with eKART. AWB: "+ response?.tracking_id,
}
);


  

}
  storeforcheck.push({message:response?.tracking_id!=undefined&&response?.tracking_id!=null?response.remark:response.description})
 }



 else if(data22.ratelist[tmpod.referenceId].type[data22.coureir[x]].toLowerCase().includes("smc") 
  && (payload.data.orderlist[x].platform=="Manual" || payload.data.orderlist[x].platform=="Merged") && charge<=user.walletBalance)
  {
            
          
let response=await this.createShippmentinnufill(payload.data.orderlist[x],payload.data.warehouselist[x],data22,x)

// await this.fulfillOrder(tmpod,response?.data?.awbNumber)


if(response?.data?.awbNumber!=undefined && response?.data?.awbNumber!=null){

  await Order.update(
  {
    courier: data22.ratelist[tmpod.referenceId].type[data22.coureir[x]] || null,
    status: response?.data?.awbNumber ? "READY FOR DISPATCH" : payload.data.orderlist[x].status,
    awb: response?.data?.awbNumber || null,
    trackingnumber: response?.data?.orderId || null,
    orderDate:data22.dispatchdate[tmpod.referenceId] || tmpod.orderDate || tmpod.processedAt,
processedAt:data22.dispatchdate[tmpod.referenceId] || tmpod.orderDate || tmpod.processedAt,
    warehouse:payload.data.warehouselist[x],
     chargecor:charge,
    rtoCharge,
    zone:payload.data.zone[x]

  },
  {
    where: { referenceId: payload.data.orderlist[x].referenceId }
  }

);
const newBalance = this._roundMoney(this._toMoney(user.walletBalance, 0) - charge);
      await User.update(
        { walletBalance: newBalance },
        { where: { id: tmpod.seller } }
      );

      




  const data = await Wallet.create({

  user_id:tmpod.seller,
status:"Debited",
amount:this._roundMoney(charge),
transid:response?.data?.awbNumber,
referenceId:tmpod.referenceId,
description:"Shipment created with SMC. AWB: "+ response?.data?.awbNumber
}
);
}
  storeforcheck.push({message:response?.status==200?payload.data.orderlist[x].referenceId+"->"+"Order received successfully":payload.data.orderlist[x].referenceId+"->"+response.message})
    // storeforcheck.push({message:"Invalid courier or platform for order "+payload.data.orderlist[x].orderNumber})
 }
 else if(data22.ratelist[tmpod.referenceId].type[data22.coureir[x]].toLowerCase().includes("ekart") && 
 (payload.data.orderlist[x].platform=="Manual" || payload.data.orderlist[x].platform=="Merged") && charge<=user.walletBalance){

 let response =await this.createShippmentekart(payload.data.orderlist[x],payload.data.warehouselist[x],data22)
 
               
// await this.fulfillOrder(tmpod,response?.barcodes?.wbn)


if(response?.tracking_id!=undefined && response?.tracking_id!=null){

  try{



      await Order.update(
  {
    courier: data22.ratelist[tmpod.referenceId].type[data22.coureir[x]] || null,
    status: (response?.barcodes?.wbn || response?.tracking_id) ? "READY FOR DISPATCH" : payload.data.orderlist[x].status,
    awb: response?.barcodes?.wbn || null,
orderDate:data22.dispatchdate[tmpod.referenceId] || tmpod.orderDate || tmpod.processedAt,
processedAt:data22.dispatchdate[tmpod.referenceId] || tmpod.orderDate || tmpod.processedAt,
    warehouse:payload.data.warehouselist[x],  
     chargecor:charge,
    rtoCharge,
    zone:payload.data.zone[x]
  },
  {
    where: { referenceId: payload.data.orderlist[x].referenceId }
  }

);
const newBalance = this._roundMoney(this._toMoney(user.walletBalance, 0) - charge);
      await User.update(
        { walletBalance: newBalance },
        { where: { id: tmpod.seller } }
      );

console.log(response,"nitish>>>>>>>>>>>>>>>>>>>>>>>>>>>>>","xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx")
      




  const data = await Wallet.create({

  user_id:tmpod.seller,
status:"Debited",
amount:this._roundMoney(charge),
transid:response?.tracking_id,
referenceId:tmpod.referenceId,
description:"Shipment created with eKART. AWB: "+ response?.tracking_id,
}
);



  storeforcheck.push({message:response?.tracking_id!=undefined&&response?.tracking_id!=null?response.remark:response.description})

  }




catch(e){
  console.log(e,"sdfksdjfk sdfkjdsfk kjkjkkkkkkkkkkkkkkkkkk")
  
  
}
}

 }


  else if(data22.ratelist[tmpod.referenceId].type[data22.coureir[x]].toLowerCase().includes("delhivery") && 
 (payload.data.orderlist[x].platform=="Manual" || payload.data.orderlist[x].platform=="Merged" || payload.data.orderlist[x].platform=="Shopify" || payload.data.orderlist[x].platform=="WooCommerce") && charge<=user.walletBalance){

 let response =await this.createShippmentDelhivery(payload.data.orderlist[x],payload.data.warehouselist[x],data22,data22.coureir[x],x)
//  console.log(response,"nitish>>>111111111111>>>>>>>>>>>>>>>>>>>>>>>>>>")
                 try{
const delhiveryWaybill = response?.packages?.[0]?.waybill || response?.packages?.[0]?.wbn || null;
if (delhiveryWaybill) {
 await Order.update(
  {
    courier: data22.ratelist[tmpod.referenceId].type[data22.coureir[x]] || null,
    status: (response?.packages?.[0]?.waybill) ? "READY FOR DISPATCH" : payload.data.orderlist[x].status,
    awb: (response?.packages?.[0]?.waybill || response?.packages?.[0]?.wbn) || null,
orderDate:data22.dispatchdate[tmpod.referenceId] || tmpod.orderDate || tmpod.processedAt,
processedAt:data22.dispatchdate[tmpod.referenceId] || tmpod.orderDate || tmpod.processedAt,
    warehouse:payload.data.warehouselist[x],  
     chargecor:charge,
    rtoCharge,
    zone:payload.data.zone[x]
  },
  {
    where: { referenceId: payload.data.orderlist[x].referenceId }
  }
);
  await this.fulfillOrder(tmpod, delhiveryWaybill, data22.ratelist[tmpod.referenceId].type[data22.coureir[x]] || null);
}

 console.log(response,"nitish>>>222222>>>>>>>>>>>>>>>>>>>>>>>>>>")


if(delhiveryWaybill){

  try{
const newBalance = this._roundMoney(this._toMoney(user.walletBalance, 0) - charge);
      await User.update(
        { walletBalance: newBalance },
        { where: { id: tmpod.seller } }
      );

  const data = await Wallet.create({

  user_id:tmpod.seller,
status:"Debited",
amount:this._roundMoney(charge),
transid:delhiveryWaybill,
referenceId:tmpod.referenceId,
description:"Shipment created with Delhivery. AWB: "+ delhiveryWaybill,
}
);



  storeforcheck.push({message: payload.data.orderlist[x].referenceId + "->Shipment created successfully"})

  }




catch(e){
  console.log(e,"sdfksdjfk sdfkjdsfk kjkjkkkkkkkkkkkkkkkkkk")
  
  
}
} else {
  storeforcheck.push({
    message:
      payload.data.orderlist[x].referenceId +
      "->" +
      (response?.message || this._extractDelhiveryRemarks(response) || "Delhivery shipment failed"),
  });
}
                 }
                 catch(e){
                  console.log(e,"error in delhivery update")
                  storeforcheck.push({
                    message: payload.data.orderlist[x].referenceId + "->Delhivery update error: " + (e.message || "unknown"),
                  });
                 }

 }

    else if(data22.ratelist[tmpod.referenceId].type[data22.coureir[x]].toLowerCase().includes("shadowfax") && 
 (payload.data.orderlist[x].platform=="Manual" || payload.data.orderlist[x].platform=="Merged" || payload.data.orderlist[x].platform=="Shopify" || payload.data.orderlist[x].platform=="WooCommerce") && charge<=user.walletBalance){

 let response =await this.createShippmentShadowfox(payload.data.orderlist[x],payload.data.warehouselist[x],data22)
                 try{
                  
     if(!response?.errors){
      

                 
//  console.log(response,"shadowfax>>>222222>>>>>>>>>>>>>>>>>>>>>>>>>>")


if(response?.data?.awb_number){

  try{


     await Order.update( 
  {
    courier: data22.ratelist[tmpod.referenceId].type[data22.coureir[x]] || null,
    status: response?.data?.awb_number ? "READY FOR DISPATCH" : payload.data.orderlist[x].status,
    awb: response?.data?.awb_number || null,
orderDate:data22.dispatchdate[tmpod.referenceId] || tmpod.orderDate || tmpod.processedAt,
processedAt:data22.dispatchdate[tmpod.referenceId] || tmpod.orderDate || tmpod.processedAt,
    warehouse:payload.data.warehouselist[x],  
     chargecor:charge,
    rtoCharge,
    zone:payload.data.zone[x]
  },
  {
    where: { referenceId: payload.data.orderlist[x].referenceId }
  }

);
await this.fulfillOrder(tmpod,response?.data?.awb_number,data22.ratelist[tmpod.referenceId].type[data22.coureir[x]] || null)

const newBalance = this._roundMoney(this._toMoney(user.walletBalance, 0) - charge);
      await User.update(
        { walletBalance: newBalance },
        { where: { id: tmpod.seller } } 
      );

// console.log(response,"nitish>>>>>33333333333>>>>>>>>>>>>>>>>>>>>>>>>","xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx")
      

        


  const data = await Wallet.create({

  user_id:tmpod.seller,
status:"Debited",
amount:this._roundMoney(charge),
transid:response?.data?.awb_number,       
referenceId:tmpod.referenceId,
description:"Shipment created with Shadowfax. AWB: "+ response?.data?.awb_number,
}
);               



  storeforcheck.push({message:response?.data?.awb_number!=undefined&&response?.data?.awb_number!=null?"Shipment created successfully":response.description})

  }




catch(e){
  console.log(e,"sdfksdjfk sdfkjdsfk kjkjkkkkkkkkkkkkkkkkkk")
  
  
}
}


     }
     else{
  storeforcheck.push({message:response?.errors})


     }
                 }
                 catch(e){
                  console.log(e,"error in delhivery update")
                 }

 }

    else if (
      data22.ratelist[tmpod.referenceId].type[data22.coureir[x]].toLowerCase().includes("xpressbees") &&
      (payload.data.orderlist[x].platform == "Manual" ||
        payload.data.orderlist[x].platform == "Merged" ||
        payload.data.orderlist[x].platform == "Shopify" ||
        payload.data.orderlist[x].platform == "WooCommerce") &&
      charge <= user.walletBalance
    ) {
      let response = await this.createShippmentXpressbees(
        payload.data.orderlist[x],
        payload.data.warehouselist[x],
        data22,
        x
      );
      console.log(response, "xpressbees>>> create");

      try {
        if (response?.success && response?.awb) {
          await Order.update(
            {
              courier: data22.ratelist[tmpod.referenceId].type[data22.coureir[x]] || null,
              status: "READY FOR DISPATCH",
              awb: response.awb || null,
              orderDate: data22.dispatchdate[tmpod.referenceId] || tmpod.orderDate || tmpod.processedAt,
              processedAt: data22.dispatchdate[tmpod.referenceId] || tmpod.orderDate || tmpod.processedAt,
              warehouse: payload.data.warehouselist[x],
              chargecor: charge,
              rtoCharge,
              zone: payload.data.zone[x]
            },
            { where: { referenceId: payload.data.orderlist[x].referenceId } }
          );

          await this.fulfillOrder(
            tmpod,
            response.awb,
            data22.ratelist[tmpod.referenceId].type[data22.coureir[x]] || null
          );

          const newBalance = this._roundMoney(this._toMoney(user.walletBalance, 0) - charge);
          await User.update(
            { walletBalance: newBalance },
            { where: { id: tmpod.seller } }
          );

          await Wallet.create({
            user_id: tmpod.seller,
            status: "Debited",
            amount: this._roundMoney(charge),
            transid: response.awb,
            referenceId: tmpod.referenceId,
            description: "Shipment created with Xpressbees. AWB: " + response.awb
          });

          storeforcheck.push({
            message: payload.data.orderlist[x].referenceId + "->Shipment created successfully (Xpressbees AWB: " + response.awb + ")"
          });
        } else {
          storeforcheck.push({
            message:
              payload.data.orderlist[x].referenceId +
              "->" +
              (response?.message || "Xpressbees shipment failed")
          });
        }
      } catch (e) {
        console.log(e, "error in xpressbees update");
        storeforcheck.push({
          message: payload.data.orderlist[x].referenceId + "->Xpressbees update error"
        });
      }
    }

    else if (
      (data22.ratelist[tmpod.referenceId].type[data22.coureir[x]].toLowerCase().includes("bluedart") ||
        data22.ratelist[tmpod.referenceId].type[data22.coureir[x]].toLowerCase().includes("blue dart")) &&
      (payload.data.orderlist[x].platform == "Manual" ||
        payload.data.orderlist[x].platform == "Merged" ||
        payload.data.orderlist[x].platform == "Shopify" ||
        payload.data.orderlist[x].platform == "WooCommerce") &&
      charge <= user.walletBalance
    ) {
      let response = await this.createShippmentBlueDart(
        payload.data.orderlist[x],
        payload.data.warehouselist[x],
        data22,
        x
      );
      console.log(response, "bluedart>>> create");

      try {
        if (response?.success && response?.awb) {
          await Order.update(
            {
              courier: data22.ratelist[tmpod.referenceId].type[data22.coureir[x]] || null,
              status: "READY FOR DISPATCH",
              awb: response.awb || null,
              orderDate: data22.dispatchdate[tmpod.referenceId] || tmpod.orderDate || tmpod.processedAt,
              processedAt: data22.dispatchdate[tmpod.referenceId] || tmpod.orderDate || tmpod.processedAt,
              warehouse: payload.data.warehouselist[x],
              chargecor: charge,
              rtoCharge,
              zone: payload.data.zone[x]
            },
            { where: { referenceId: payload.data.orderlist[x].referenceId } }
          );

          await this.fulfillOrder(
            tmpod,
            response.awb,
            data22.ratelist[tmpod.referenceId].type[data22.coureir[x]] || null
          );

          const newBalance = this._roundMoney(this._toMoney(user.walletBalance, 0) - charge);
          await User.update(
            { walletBalance: newBalance },
            { where: { id: tmpod.seller } }
          );

          await Wallet.create({
            user_id: tmpod.seller,
            status: "Debited",
            amount: this._roundMoney(charge),
            transid: response.awb,
            referenceId: tmpod.referenceId,
            description: "Shipment created with BlueDart. AWB: " + response.awb
          });

          storeforcheck.push({
            message: payload.data.orderlist[x].referenceId + "->Shipment created successfully (BlueDart AWB: " + response.awb + ")"
          });
        } else {
          storeforcheck.push({
            message:
              payload.data.orderlist[x].referenceId +
              "->" +
              (response?.message || "BlueDart shipment failed")
          });
        }
      } catch (e) {
        console.log(e, "error in bluedart update");
        storeforcheck.push({
          message: payload.data.orderlist[x].referenceId + "->BlueDart update error"
        });
      }
    }

 else
  {
  storeforcheck.push({message:"May be not enough ballance for order "+payload.data.orderlist[x].referenceId})

 }       
}else{

  storeforcheck.push({message:payload.data.orderlist[x].referenceId+"->"+"Order are already shipped"})

}
    }
return storeforcheck

  }
  catch(e){
   console.log(e,"bulk shipment error")

    return storeforcheck
  }



  }






  async dispute_order(tmpdata){
    try{
      const payload={
        dispute_status:tmpdata.dispute_status,
        dispute_file_:tmpdata.dispute_file_,
        dispute_file:tmpdata.dispute_file,
        dispute_reason:tmpdata.dispute_reason || 'Weight Dispute',
        previousweight:tmpdata.previousweight,
        claimweight:tmpdata.claimweight
      };

      const where = tmpdata.id
        ? { id: tmpdata.id }
        : tmpdata.awb
          ? { awb: tmpdata.awb }
          : { referenceId: tmpdata.referenceId };

      if (!where.id && !where.awb && !where.referenceId) {
        return { message: "Order identifier is required", status: 400 };
      }

      const [updated] = await Order.update(payload, { where });
      if (!updated) {
        return { message: "Order not found", status: 400 };
      }

      return { data: { updated }, message: "success", status: 200 };
    }
    catch(e){
      return { message: e.message || "Error", status: 400 };
    }
  }

  _toNum(value, fallback = null) {
    if (value === '' || value === undefined || value === null) return fallback;
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  _sanitizeOrderItems(items = []) {
    return items.map((item) => {
      const height = this._toNum(item.height);
      const width = this._toNum(item.width);
      const length = this._toNum(item.length);
      const unitPrice = this._toNum(item.unitPrice, 0) ?? 0;
      const quantity = Math.max(1, parseInt(item.quantity, 10) || 1);
      const gstRate = this._toNum(item.gstRate, 0) ?? 0;
      const deadWeight = this._toNum(item.deadWeight);
      const volumetricWeight =
        this.calculateVolumetricWeight(height, width, length) ??
        this._toNum(item.volumetricWeight);
      const hsnCode = String(item.hsnCode || item.hsn || item.hsn_code || '').trim() || null;

      return {
        name: item.name || '',
        sku: item.sku || item.productId || '',
        hsnCode,
        unitPrice,
        quantity,
        gstRate,
        discount: this._toNum(item.discount, 0) ?? 0,
        height,
        width,
        length,
        deadWeight,
        volumetricWeight,
        totalPrice: this.calculateTotalPrice(unitPrice, quantity, gstRate, this._toNum(item.discount, 0) ?? 0),
      };
    });
  }

  _pickOrderUpdateFields(orderData = {}) {
    const allowed = [
      'orderNumber', 'referenceId', 'customerName', 'customerPhone', 'customerEmail',
      'seller', 'courier', 'status', 'amount', 'warehouse', 'orderDate',
      'awb', 'platform', 'pincode', 'city', 'state', 'addressLine1',
      'addressLine2', 'landmark', 'user_id', 'totalItems', 'totalWeight',
      'totalVolumetricWeight', 'financialStatus', 'fulfillmentStatus',
      'paymentGateway', 'subtotalPrice', 'totalTax', 'totalDiscounts',
      'totalShippingPrice', 'totalOutstanding', 'currency', 'taxesIncluded',
      'taxExempt', 'confirmationNumber', 'checkoutId', 'checkoutToken',
      'orderStatusUrl', 'sourceName', 'browserIp', 'userAgent',
      'shippingAddress', 'billingAddress', 'customerData', 'processedAt',
      'cancelledAt', 'cancelReason', 'trackingnumber', 'zone', 'chargecor',
      'codpaidstatus', 'shopifyOrderId', 'ndrreason',
      'orderType', 'packages', 'billingParty', 'b2bCharge', 'b2bRateCardId',
      'manualBooking', 'consigneeGstin', 'ewayBill', 'appointmentAt', 'epodUrl',
      'freightMode', 'rovType', 'discountCodes', 'codCharge',
      'alternatePhone', 'customerId', 'sellerOrderId', 'orderTags',
      'addressType', 'country', 'packageType', 'packageCount',
      'shippingMode', 'courierService', 'expectedDeliveryDate',
    ];

    const fields = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(orderData, key)) {
        fields[key] = orderData[key];
      }
    }

    if (fields.customerEmail === '') fields.customerEmail = null;
    if (fields.courier === '') fields.courier = '-';
    if (fields.awb === '') fields.awb = '-';
    if (fields.fulfillmentStatus === '' || fields.fulfillmentStatus === undefined) {
      fields.fulfillmentStatus = null;
    }
    if (fields.user_id != null) fields.user_id = Number(fields.user_id) || fields.user_id;
    if (fields.seller != null) fields.seller = String(fields.seller);

    // Persist payment mode consistently
    if (fields.paymentGateway === 'COD' || fields.paymentGateway === 'Cash on Delivery (COD)') {
      fields.financialStatus = 'pending';
    } else if (fields.paymentGateway === 'Prepaid') {
      fields.financialStatus = 'paid';
    }

    return fields;
  }

  // Update order
  async updateOrder(id, payload) {
    // Accept both { data: orderFields } and flat orderFields
    const orderData = (payload && payload.data !== undefined) ? payload.data : payload;

    if (!orderData || typeof orderData !== 'object') {
      throw new Error('Invalid order update payload');
    }

    const order = await this.getOrderById(id);

    const normalizeAwb = (value) => {
      const s = String(value ?? '').trim();
      if (!s || s === '-' || s === '—') return '-';
      return s;
    };

    const requestingUserId = payload?.user_id;
    let resolvedIsAdmin = null;
    const resolveIsAdmin = async () => {
      if (resolvedIsAdmin !== null) return resolvedIsAdmin;
      if (!requestingUserId) {
        resolvedIsAdmin = false;
        return false;
      }
      let isAdmin = Number(requestingUserId) === 1;
      if (!isAdmin) {
        try {
          const requester = await User.findByPk(requestingUserId, {
            attributes: ['id', 'roleId'],
            include: [{ association: 'role', attributes: ['name'], required: false }],
          });
          const roleName = String(requester?.role?.name || '').toLowerCase();
          isAdmin = roleName === 'admin' || roleName === 'super admin';
        } catch (_) {
          isAdmin = false;
        }
      }
      resolvedIsAdmin = isAdmin;
      return isAdmin;
    };

    if (Object.prototype.hasOwnProperty.call(orderData, 'courier')) {
      const normalizeCourier = (value) => {
        const s = String(value ?? '').trim();
        if (!s || s === '-' || s === '—' || s.toLowerCase() === 'auto assign') return '-';
        return s;
      };
      const nextCourier = normalizeCourier(orderData.courier);
      const currentCourier = normalizeCourier(order.courier);
      if (nextCourier.toLowerCase() !== currentCourier.toLowerCase()) {
        const isAdmin = await resolveIsAdmin();
        if (!isAdmin) {
          const err = new Error('Only admin can update courier');
          err.statusCode = 403;
          throw err;
        }
        orderData.courier = nextCourier;
      }
    }

    if (Object.prototype.hasOwnProperty.call(orderData, 'awb')) {
      const nextAwb = normalizeAwb(orderData.awb);
      const currentAwb = normalizeAwb(order.awb);
      if (nextAwb !== currentAwb) {
        const isAdmin = await resolveIsAdmin();
        if (!isAdmin) {
          const err = new Error('Only admin can update AWB number');
          err.statusCode = 403;
          throw err;
        }
        if (nextAwb !== '-') {
          const duplicate = await Order.findOne({
            where: {
              awb: { [Op.iLike]: nextAwb },
              id: { [Op.ne]: id },
            },
            attributes: ['id', 'referenceId'],
          });
          if (duplicate) {
            const err = new Error(`AWB already used on order ${duplicate.referenceId || duplicate.id}`);
            err.statusCode = 409;
            throw err;
          }
        }
        orderData.awb = nextAwb;
      }
    }

    const hasAwb = order.awb && order.awb !== '-' && order.awb !== '';
    // Sellers cannot change order details after AWB is generated (status-only updates allowed for NDR actions).
    if (hasAwb && requestingUserId) {
      const isAdmin = await resolveIsAdmin();
      if (!isAdmin) {
        const keys = Object.keys(orderData).filter((k) => orderData[k] !== undefined);
        const allowedAfterAwb = new Set(['status', 'ndrreason', 'codpaidstatus']);
        const blocked = keys.filter((k) => !allowedAfterAwb.has(k) && k !== 'items');
        const hasItemEdits = Array.isArray(orderData.items);
        if (blocked.length > 0 || hasItemEdits) {
          const err = new Error('Order cannot be edited after AWB is generated');
          err.statusCode = 403;
          throw err;
        }
      }
    }

    const transaction = await Order.sequelize.transaction();

    try {
      let totalsPatch = {};

      const shouldRecalculateTotals =
        Array.isArray(orderData.items) ||
        Object.prototype.hasOwnProperty.call(orderData, 'totalDiscounts') ||
        Object.prototype.hasOwnProperty.call(orderData, 'totalShippingPrice');

      // COD amount-only edits must keep the explicit amount/totalOutstanding (do not recompute from items)
      const isCodAmountOnlyUpdate =
        !Array.isArray(orderData.items) &&
        (Object.prototype.hasOwnProperty.call(orderData, 'totalOutstanding') ||
          Object.prototype.hasOwnProperty.call(orderData, 'amount')) &&
        !Object.prototype.hasOwnProperty.call(orderData, 'totalDiscounts') &&
        !Object.prototype.hasOwnProperty.call(orderData, 'totalShippingPrice');

      if (shouldRecalculateTotals && !isCodAmountOnlyUpdate) {
        const itemsForTotals = Array.isArray(orderData.items)
          ? this._sanitizeOrderItems(orderData.items)
          : this._sanitizeOrderItems((order.items || []).map((item) => item.toJSON ? item.toJSON() : item));
        const totals = this.calculateOrderTotals(itemsForTotals, {
          totalDiscounts: orderData.totalDiscounts ?? order.totalDiscounts,
          totalShippingPrice: orderData.totalShippingPrice ?? order.totalShippingPrice,
        });
        totalsPatch = {
          amount: totals.totalAmount,
          totalItems: totals.totalItems,
          totalWeight: totals.totalWeight,
          totalVolumetricWeight: totals.totalVolumetricWeight,
        };
        if (orderData.amount) totalsPatch.amount = orderData.amount;
        if (orderData.subtotalPrice != null) totalsPatch.subtotalPrice = orderData.subtotalPrice;
        if (orderData.totalTax != null) totalsPatch.totalTax = orderData.totalTax;
        if (orderData.amount) {
          totalsPatch.amount = orderData.amount;
        }
        if (orderData.subtotalPrice != null) totalsPatch.subtotalPrice = orderData.subtotalPrice;
        if (orderData.totalTax != null) totalsPatch.totalTax = orderData.totalTax;

        // Prefer client package / explicit totals (Weight & Dimensions) over item-derived weights
        if (Object.prototype.hasOwnProperty.call(orderData, 'totalWeight') && orderData.totalWeight != null) {
          totalsPatch.totalWeight = orderData.totalWeight;
        }
        if (
          Object.prototype.hasOwnProperty.call(orderData, 'totalVolumetricWeight') &&
          orderData.totalVolumetricWeight != null
        ) {
          totalsPatch.totalVolumetricWeight = orderData.totalVolumetricWeight;
        }

        if (Array.isArray(orderData.items)) {
          await OrderItem.destroy({
            where: { orderId: id },
            transaction
          });

          await OrderItem.bulkCreate(
            itemsForTotals.map((item) => ({ ...item, orderId: id })),
            { transaction }
          );
        }
      } else if (Array.isArray(orderData.items)) {
        const processedItems = this._sanitizeOrderItems(orderData.items);
        await OrderItem.destroy({
          where: { orderId: id },
          transaction
        });
        await OrderItem.bulkCreate(
          processedItems.map((item) => ({ ...item, orderId: id })),
          { transaction }
        );
      }

      const orderFields = {
        ...this._pickOrderUpdateFields(orderData),
        ...totalsPatch,
      };

      // Keep explicit COD amount when provided
      if (isCodAmountOnlyUpdate) {
        if (Object.prototype.hasOwnProperty.call(orderData, 'amount')) {
          orderFields.amount = orderData.amount;
        }
        if (Object.prototype.hasOwnProperty.call(orderData, 'totalOutstanding')) {
          orderFields.totalOutstanding = orderData.totalOutstanding;
        }
      }

      const previousStatus = order.status;

      // Ensure JSON packages field is always written (Sequelize can miss JSON diffs)
      if (Object.prototype.hasOwnProperty.call(orderFields, 'packages')) {
        order.set('packages', orderFields.packages);
        order.changed('packages', true);
      }

      await order.update(orderFields, { transaction });
      await transaction.commit();

      const updated = await this.getOrderById(id);
      try {
        const isRtoLike = (s) => {
          const v = String(s || '').toLowerCase();
          return v.includes('rto') || v.includes('return to origin');
        };
        if (
          Object.prototype.hasOwnProperty.call(orderData, 'status') &&
          !isRtoLike(previousStatus) &&
          isRtoLike(updated.status)
        ) {
          await this.deductAutoRtoCharge(updated);
        }
      } catch (rtoErr) {
        console.error(
          `[deductAutoRtoCharge] updateOrder failed for ${updated?.referenceId}:`,
          rtoErr?.message || rtoErr
        );
      }
      // AWB / courier / status edits from the panel must also reach the Shopify order.
      this.syncShopifyOrder(updated);
      return updated;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Delete order
  async deleteOrder(id) {
    const order = await this.getOrderById(id);
    await order.destroy();
    return { message: 'Order deleted successfully' };
  }

  _bulkOrderWhere(ids, userId = null) {
    const where = { id: { [Op.in]: ids } };
    if (userId != null) {
      where[Op.or] = [
        { user_id: userId },
        { seller: String(userId) },
      ];
    }
    return where;
  }

  async bulkDeleteOrders(ids, userId = null) {
    const uniqueIds = [...new Set(ids)];
    const orders = await Order.findAll({
      where: this._bulkOrderWhere(uniqueIds, userId),
      attributes: ['id', 'referenceId', 'status'],
    });
    const deletable = orders.filter((order) => order.status === 'Pending');
    const skipped = orders
      .filter((order) => order.status !== 'Pending')
      .map((order) => ({
        id: order.id,
        referenceId: order.referenceId,
        reason: `Only Pending orders can be deleted (current status: ${order.status})`,
      }));
    const foundIds = new Set(orders.map((order) => order.id));
    uniqueIds
      .filter((id) => !foundIds.has(id))
      .forEach((id) => skipped.push({ id, reason: 'Order not found or access denied' }));

    const deletableIds = deletable.map((order) => order.id);
    if (deletableIds.length > 0) {
      const transaction = await Order.sequelize.transaction();
      try {
        await OrderItem.destroy({
          where: { orderId: { [Op.in]: deletableIds } },
          transaction,
        });
        await Order.destroy({
          where: { id: { [Op.in]: deletableIds } },
          transaction,
        });
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    }

    return {
      deletedCount: deletableIds.length,
      deletedIds: deletableIds,
      skipped,
    };
  }

  async bulkCancelOrders(ids, userId = null, reason = 'Customer requested cancellation') {
    const uniqueIds = [...new Set(ids)];
    const orders = await Order.findAll({
      where: this._bulkOrderWhere(uniqueIds, userId),
      attributes: ['id', 'referenceId', 'status', 'awb', 'courier', 'platform', 'shopifyOrderId', 'user_id'],
    });
    const foundById = new Map(orders.map((order) => [order.id, order]));
    const results = [];

    for (const id of uniqueIds) {
      const order = foundById.get(id);
      if (!order) {
        results.push({ id, success: false, reason: 'Order not found or access denied' });
        continue;
      }
      if (order.status === 'Delivered') {
        results.push({
          id,
          referenceId: order.referenceId,
          success: false,
          reason: 'Delivered orders cannot be cancelled',
        });
        continue;
      }
      if (order.status === 'Cancelled') {
        results.push({
          id,
          referenceId: order.referenceId,
          success: false,
          reason: 'Order is already cancelled',
        });
        continue;
      }

      try {
        const hasShipment = order.awb && order.awb !== '-' && order.courier && order.courier !== '-';
        if (!hasShipment) {
          await order.update({
            status: 'Cancelled',
            cancelledAt: new Date(),
            cancelReason: reason,
          });
        } else {
          const response = await this.cancelshipment(order.referenceId);
          const refreshed = await Order.findByPk(order.id, { attributes: ['status'] });
          if (refreshed?.status !== 'Cancelled') {
            results.push({
              id,
              referenceId: order.referenceId,
              success: false,
              reason: response?.message || 'Courier cancellation failed',
            });
            continue;
          }
        }
        results.push({ id, referenceId: order.referenceId, success: true });
        // Mirror the cancellation on Shopify (cancels the fulfillment / tags the order).
        this.syncShopifyOrderByReference(order.referenceId, 'Cancelled');
      } catch (error) {
        results.push({
          id,
          referenceId: order.referenceId,
          success: false,
          reason: error.message || 'Cancellation failed',
        });
      }
    }

    return {
      cancelledCount: results.filter((result) => result.success).length,
      cancelledIds: results.filter((result) => result.success).map((result) => result.id),
      failed: results.filter((result) => !result.success),
    };
  }

  // Update order status
  async updateOrderStatus(id, status) {
    const order = await this.getOrderById(id);
    const previousStatus = order.status;
    await order.update({ status });
    try {
      const isRtoLike = (s) => {
        const v = String(s || '').toLowerCase();
        return v.includes('rto') || v.includes('return to origin');
      };
      if (!isRtoLike(previousStatus) && isRtoLike(status)) {
        await this.deductAutoRtoCharge(order);
      }
    } catch (rtoErr) {
      console.error(
        `[deductAutoRtoCharge] updateOrderStatus failed for ${order?.referenceId}:`,
        rtoErr?.message || rtoErr
      );
    }
    // Status changes made in the panel must also reach the Shopify order.
    this.syncShopifyOrder(order);
    return order;
  }

  /**
   * Deduct reverse freight + GST when tracking first marks an order RTO.
   * Idempotent via row lock + order.rtoCharged + existing Auto RTO wallet rows.
   */
  async deductAutoRtoCharge(order) {
    if (!order) return { success: false, skipped: true, reason: 'no_order' };

    const sequelize = Order.sequelize;
    const transaction = await sequelize.transaction();

    try {
      const target = order.id
        ? await Order.findByPk(order.id, {
            transaction,
            lock: transaction.LOCK.UPDATE,
          })
        : order;

      if (!target) {
        await transaction.rollback();
        return { success: false, skipped: true, reason: 'no_order' };
      }

      if (target.rtoCharged) {
        await transaction.rollback();
        return { success: true, skipped: true, reason: 'already_charged' };
      }

      const referenceId = target.referenceId;
      if (referenceId) {
        const existing = await Wallet.findOne({
          where: {
            referenceId,
            [Op.or]: [
              { rto: 'charged' },
              { description: { [Op.iLike]: '%Auto RTO%' } },
            ],
          },
          transaction,
        });
        if (existing) {
          await target.update({ rtoCharged: true }, { transaction });
          await transaction.commit();
          return { success: true, skipped: true, reason: 'wallet_already_charged' };
        }
      }

      let amount = this._toMoney(target.rtoCharge, null);
      if (amount === null || amount <= 0) {
        amount = this._toMoney(target.chargecor, 0);
        if (amount <= 0) {
          await transaction.rollback();
          console.warn(
            `[deductAutoRtoCharge] Skipping order ${referenceId}: no rtoCharge/chargecor`
          );
          return { success: false, skipped: true, reason: 'missing_rto_charge' };
        }
      }

      amount = this._roundMoney(amount);
      if (amount <= 0) {
        await transaction.rollback();
        console.warn(
          `[deductAutoRtoCharge] Skipping order ${referenceId}: non-positive amount`
        );
        return { success: false, skipped: true, reason: 'zero_amount' };
      }

      const sellerId = this._toMoney(target.seller, null) || target.user_id;
      if (!sellerId) {
        await transaction.rollback();
        console.warn(
          `[deductAutoRtoCharge] Skipping order ${referenceId}: no seller id`
        );
        return { success: false, skipped: true, reason: 'no_seller' };
      }

      const user = await User.findByPk(sellerId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!user) {
        await transaction.rollback();
        console.warn(
          `[deductAutoRtoCharge] Skipping order ${referenceId}: seller ${sellerId} not found`
        );
        return { success: false, skipped: true, reason: 'seller_not_found' };
      }

      // Claim the order first so a parallel cron/track call cannot debit again.
      const [claimed] = await Order.update(
        { rtoCharged: true },
        { where: { id: target.id, rtoCharged: false }, transaction }
      );
      if (!claimed) {
        await transaction.rollback();
        return { success: true, skipped: true, reason: 'already_charged' };
      }

      const newBalance = this._roundMoney(this._toMoney(user.walletBalance, 0) - amount);
      await User.update(
        { walletBalance: newBalance },
        { where: { id: sellerId }, transaction }
      );

      await Wallet.create(
        {
          user_id: sellerId,
          status: 'Debited',
          rto: 'charged',
          description: 'Auto RTO charge',
          amount,
          referenceId: referenceId || null,
          orderNumber: target.orderNumber || null,
          transid: target.awb ? `RTO-${target.awb}` : `RTO-${referenceId || Date.now()}`,
        },
        { transaction }
      );

      await transaction.commit();
      target.rtoCharged = true;

      console.log(
        `[deductAutoRtoCharge] Deducted ${amount} for order ${referenceId}, new balance ${newBalance}`
      );
      return { success: true, amount, newBalance };
    } catch (error) {
      try {
        await transaction.rollback();
      } catch (_) {
        /* already rolled back */
      }
      throw error;
    }
  }

  // Get order statistics
  async getOrderStats() {
    const total = await Order.count();
    
    const delivered = await Order.count({
      where: { status: 'Delivered' }
    });

    const pending = await Order.count({
      where: { status: 'Pending' }
    });

    const rto = await Order.count({
      where: { status: 'RTO' }
    });

    const cancelled = await Order.count({
      where: { status: 'Cancelled' }
    });

    const platformStats = await Order.findAll({
      attributes: [
        'platform',
        [Order.sequelize.fn('COUNT', Order.sequelize.col('platform')), 'count']
      ],
      group: ['platform']
    });

    return {
      total,
      delivered,
      pending,
      rto,
      cancelled,
      platforms: platformStats
    };
  }

  async markCodAsPaid(orderId) {
    const order = await this.getOrderById(orderId);
    
    // Only allow marking COD orders as paid
    const isCOD = String(order.financialStatus || '').toLowerCase() === 'pending' ||
                   String(order.paymentGateway || '').toUpperCase().includes('COD');
    
    if (!isCOD) {
      throw new Error('Only COD orders can be marked as paid');
    }
    
    if (order.codpaidstatus === 'Settled') {
      throw new Error('Order is already marked as paid');
    }
    
    await order.update({
      financialStatus: 'paid',
      codpaidstatus: 'Settled'
    });
    
    return await this.getOrderById(orderId);
  }
}

module.exports = new OrderService();

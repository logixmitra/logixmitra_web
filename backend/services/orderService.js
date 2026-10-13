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
  return this.getAllOrdersWithScope({}, filters);
}

  async getAllOrdersWithScope(scopeWhere = {}, filters = {}) {
  const where = {};
  const andConditions = [];
  if (scopeWhere && typeof scopeWhere === 'object' && Reflect.ownKeys(scopeWhere).length) {
    // Reflect.ownKeys, NOT Object.keys: Sequelize Op.and / Op.or keys are
    // Symbols. Object.keys() returned [] for the dashboard's seller scope
    // ({ [Op.and]: [...] }), silently dropping it and serving GLOBAL counts
    // on the dashboard cards for logged-in sellers.
    andConditions.push(scopeWhere);
  }

  if (filters.status) {
    const statusKey = String(filters.status).trim().toLowerCase();
    // Every AWB order not already in a later shipment stage belongs here.
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
            // Keep pickup/manifest stages in their dedicated tab and prevent
            // terminal shipment statuses from appearing in Courier Assigned.
            [Op.or]: [
              { status: null },
              {
                [Op.and]: [
                  { status: { [Op.notILike]: '%Picked Up%' } },
                  { status: { [Op.notILike]: '%Pickup Complete%' } },
                  { status: { [Op.notILike]: '%Pickup Done%' } },
                  { status: { [Op.notILike]: '%Shipped%' } },
                  { status: { [Op.notILike]: '%Dispatched%' } },
                  { status: { [Op.notILike]: '%In Transit%' } },
                  { status: { [Op.notILike]: '%Out for Delivery%' } },
                  { status: { [Op.notILike]: '%Delivered%' } },
                  { status: { [Op.notILike]: '%RTO%' } },
                  { status: { [Op.notILike]: '%Return to Origin%' } },
                  { status: { [Op.notILike]: '%UNDELIVERED%' } },
                  { status: { [Op.notILike]: '%NDR%' } },
                  { status: { [Op.notILike]: '%Reattempt%' } },
                  { status: { [Op.notILike]: '%Cancelled%' } },
                  { status: { [Op.notILike]: '%Canceled%' } },
                  { status: { [Op.notILike]: '%pickup%' } },
                  { status: { [Op.notILike]: '%manifest%' } },
                  { status: { [Op.notILike]: '%label created%' } },
                ],
              },
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
            ],
          },
        ],
      });
      andConditions.push({
        [Op.and]: [
          { status: { [Op.notILike]: '%Picked Up%' } },
          { status: { [Op.notILike]: '%Pickup Complete%' } },
          { status: { [Op.notILike]: '%Pickup Done%' } },
          { status: { [Op.notILike]: '%In Transit%' } },
          { status: { [Op.notILike]: '%Shipped%' } },
          { status: { [Op.notILike]: '%Dispatched%' } },
          { status: { [Op.notILike]: '%Out for Delivery%' } },
          { status: { [Op.notILike]: '%Delivered%' } },
          { status: { [Op.notILike]: '%RTO%' } },
          { status: { [Op.notILike]: '%Return to Origin%' } },
          { status: { [Op.notILike]: '%UNDELIVERED%' } },
          { status: { [Op.notILike]: '%NDR%' } },
          { status: { [Op.notILike]: '%Reattempt%' } },
          { status: { [Op.notILike]: '%Cancelled%' } },
          { status: { [Op.notILike]: '%Canceled%' } },
        ],
      });
    } else if (statusKey === 'in transit') {
      // Picked-up/shipped orders are in the forward journey even before the
      // courier reports an explicit "In Transit" scan.
      andConditions.push({
        [Op.and]: [
          {
            [Op.or]: [
              { status: { [Op.iLike]: '%In Transit%' } },
              { status: { [Op.iLike]: '%Picked Up%' } },
              { status: { [Op.iLike]: '%Pickup Complete%' } },
              { status: { [Op.iLike]: '%Pickup Done%' } },
              { status: { [Op.iLike]: '%Shipped%' } },
              { status: { [Op.iLike]: '%Dispatched%' } },
            ],
          },
          { status: { [Op.notILike]: '%RTO%' } },
          { status: { [Op.notILike]: '%Return to Origin%' } },
          { status: { [Op.notILike]: '%Out for Delivery%' } },
          { status: { [Op.notILike]: '%Delivered%' } },
          { status: { [Op.notILike]: '%UNDELIVERED%' } },
          { status: { [Op.notILike]: '%NDR%' } },
          { status: { [Op.notILike]: '%Reattempt%' } },
          { status: { [Op.notILike]: '%Cancelled%' } },
          { status: { [Op.notILike]: '%Canceled%' } },
          { status: { [Op.notILike]: '%manifest%' } },
          { status: { [Op.notILike]: '%pickup scheduled%' } },
          { status: { [Op.notILike]: '%out for pickup%' } },
          { status: { [Op.notILike]: '%label created%' } },
          { status: { [Op.notILike]: '%shipment expected%' } },
          { status: { [Op.notILike]: '%ready for dispatch%' } },
          { status: { [Op.notILike]: '%ready to ship%' } },
          { status: { [Op.notILike]: '%courier assigned%' } },
        ],
      });
    } else if (statusKey === 'out for delivery') {
      andConditions.push({
        [Op.and]: [
          { status: { [Op.iLike]: '%out for delivery%' } },
          { status: { [Op.notILike]: '%RTO%' } },
          { status: { [Op.notILike]: '%Return to Origin%' } },
          { status: { [Op.notILike]: '%Delivered%' } },
          { status: { [Op.notILike]: '%UNDELIVERED%' } },
          { status: { [Op.notILike]: '%NDR%' } },
          { status: { [Op.notILike]: '%Reattempt%' } },
          { status: { [Op.notILike]: '%Cancelled%' } },
          { status: { [Op.notILike]: '%Canceled%' } },
        ],
      });
    } else if (statusKey === 'delivered') {
      andConditions.push({
        [Op.and]: [
          { status: { [Op.iLike]: '%Delivered%' } },
          { status: { [Op.notILike]: '%RTO%' } },
          { status: { [Op.notILike]: '%Return to Origin%' } },
          { status: { [Op.notILike]: '%UNDELIVERED%' } },
          { status: { [Op.notILike]: '%NDR%' } },
          { status: { [Op.notILike]: '%Cancelled%' } },
          { status: { [Op.notILike]: '%Canceled%' } },
        ],
      });
    } else if (statusKey === 'pending' || statusKey === 'new') {
      // New contains any unclassified order that has no courier AWB. This
      // keeps uncommon statuses visible instead of dropping them from totals.
      andConditions.push({
        [Op.and]: [
          {
            [Op.or]: [
              { awb: null },
              { awb: '' },
              { awb: '-' },
            ],
          },
          {
            [Op.or]: [
              { status: null },
              {
                [Op.and]: [
                  { status: { [Op.notILike]: '%shipped%' } },
                  { status: { [Op.notILike]: '%dispatched%' } },
                  { status: { [Op.notILike]: '%picked up%' } },
                  { status: { [Op.notILike]: '%pickup complete%' } },
                  { status: { [Op.notILike]: '%pickup done%' } },
                  { status: { [Op.notILike]: '%in transit%' } },
                  { status: { [Op.notILike]: '%out for delivery%' } },
                  { status: { [Op.notILike]: '%delivered%' } },
                  { status: { [Op.notILike]: '%undelivered%' } },
                  { status: { [Op.notILike]: '%ndr%' } },
                  { status: { [Op.notILike]: '%reattempt%' } },
                  { status: { [Op.notILike]: '%rto%' } },
                  { status: { [Op.notILike]: '%return to origin%' } },
                  { status: { [Op.notILike]: '%cancelled%' } },
                  { status: { [Op.notILike]: '%canceled%' } },
                ],
              },
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
        [Op.and]: [
          {
            [Op.or]: [
              { status: { [Op.iLike]: '%RTO In transit%' } },
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
          },
          { status: { [Op.notILike]: '%RTO Delivered%' } },
          { status: { [Op.notILike]: '%RTO_DELIVERED%' } },
        ],
      });
    } else if (statusKey === 'rto delivered') {
      andConditions.push({
        [Op.or]: [
          { status: { [Op.iLike]: '%RTO Delivered%' } },
          { status: { [Op.iLike]: '%rto_delivered%' } },
        ],
      });
    } else if (statusKey === 'cancelled' || statusKey === 'canceled') {
      // Cancelled tab: exact Cancelled + courier cancel variants
      // ("Seller cancelled the order", "PICKUP CANCELLED",
      // "Consignee refused to accept/order cancelled"). RTO text stays out.
      andConditions.push({
        [Op.and]: [
          {
            [Op.or]: [
              { status: { [Op.iLike]: '%cancelled%' } },
              { status: { [Op.iLike]: '%canceled%' } },
            ],
          },
          { status: { [Op.notILike]: '%rto%' } },
          { status: { [Op.notILike]: '%return to origin%' } },
        ],
      });
    } else if (statusKey === 'undelivered' || statusKey === 'ndr') {
      andConditions.push({
        [Op.and]: [
          {
            [Op.or]: [
              { status: { [Op.iLike]: '%UNDELIVERED%' } },
              { status: { [Op.iLike]: '%NDR%' } },
              { status: { [Op.iLike]: '%Reattempt%' } },
            ],
          },
          { status: { [Op.notILike]: '%RTO%' } },
          { status: { [Op.notILike]: '%Return to Origin%' } },
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

  if (filters.user_id !== undefined && filters.user_id !== null && filters.user_id !== '') {
    // Match the dashboard scope (orders carry the owner on user_id and/or
    // seller) so list length, status-chip counts and dashboard cards always
    // show the same numbers for a logged-in seller.
    andConditions.push({
      [Op.or]: [
        { user_id: filters.user_id },
        { seller: String(filters.user_id) },
      ],
    });
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
    // startDateDay/endDateDay carry the exact calendar day the user picked;
    // slicing startDate/endDate is the fallback for plain-date API callers.
    const dayOf = (value) => String(value).slice(0, 10);
    const startDay = filters.startDateDay || (filters.startDate ? dayOf(filters.startDate) : undefined);
    const endDay = filters.endDateDay || (filters.endDate ? dayOf(filters.endDate) : undefined);
    // Timestamp bounds (createdAt / updatedAt) — full local-day range.
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
      // Legacy API wording: strict record-creation timestamp.
      const range = {};
      if (filters.startDate) range[Op.gte] = tsOf(filters.startDate, false);
      if (filters.endDate) range[Op.lte] = tsOf(filters.endDate, true);
      where.createdAt = range;
    } else {
      // "Order Created" (default): the Order Date column shows orderDate when
      // present and createdAt otherwise — filter on the SAME value so the range
      // matches what the user sees. orderDate is DATEONLY, so it is compared as
      // YYYY-MM-DD; only orderDate-less legacy rows fall through to createdAt.
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

  // Lightweight exact count for status chips (same filters as the list query).
  if (filters.countOnly) {
    return Order.count({ where });
  }

  const include = [{
    model: OrderItem,
    as: 'items',
  }];
  // Always latest-first:
  // 1) Order Details number ka leading numeric part (1052, 1051, 1050...) —
  //    bada number sabse upar (NULL = naam wale orders, DESC me neeche).
  // 2) Then the created date the Order Date column shows: orderDate if set,
  //    otherwise createdAt (same rule the frontend uses).
  // 3) Tie-break on createdAt then id so page slices stay stable between
  //    requests. Frontend re-sorts each page with the same rule.
  const order = [
    // Clone orders (`<number>-c` / `<number>-c-<n>`) are brand-new rows the
    // user just created — always show them at the top, newest clone first.
    literal(
      `CASE WHEN TRIM(COALESCE("Order"."orderNumber", '')) ~ '-c(-[0-9]+)?$' THEN 0 ELSE 1 END ASC`
    ),
    literal(
      `CASE WHEN TRIM(COALESCE("Order"."orderNumber", '')) ~ '-c(-[0-9]+)?$' THEN "Order"."createdAt" END DESC`
    ),
    // NOTE: DESC me NULLs by default pehle aate hain — naam wale orders ko
    // neeche bhejne ke liye NULLS LAST zaroori hai.
    literal(
      `CASE WHEN COALESCE(TRIM("Order"."orderNumber"), '') ~ '^[0-9]+' ` +
      `THEN substring(TRIM("Order"."orderNumber") from '^[0-9]+')::bigint END DESC NULLS LAST`
    ),
    // Wahi created date jo Order Date column dikhata hai (orderDate, warna
    // createdAt) — list ka order UI ke column se hamesha match kare.
    [
      literal(
        `CASE WHEN "Order"."orderDate" IS NOT NULL ` +
        `THEN "Order"."orderDate"::timestamp ELSE "Order"."createdAt" END`
      ),
      'DESC',
    ],
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
  
  const paymentMode = isCodOrder(order) ? 'COD' : 'prepaid';
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

// Registers the pickup location (client warehouse) on Delhivery for the
// account that owns `token`. Called when cmu/create fails with a Django-style
// "ClientWarehouse matching query does not exist." error, which means the
// pickup_location name is not yet registered on that Delhivery account.
// Ref: Delhivery "Client Warehouse Creation API"
//   POST https://track.delhivery.com/api/backend/clientwarehouse/create/
async _ensureDelhiveryClientWarehouse(token, pickupName, sellerInfo, seller) {
  const sanitize = (v) => this._sanitizeDelhiveryText(v);
  const digits = (v) => String(v ?? '').replace(/\D/g, '');
  const pin = digits(sellerInfo?.pincode).slice(0, 6);
  const phone = digits(sellerInfo?.phone);
  const email = String(seller?.email || process.env.DELHIVERY_CONTACT_EMAIL || '').trim();
  // Delhivery rejects registered_name containing underscores.
  const registeredName = String(seller?.company || pickupName || '').replace(/_/g, ' ').trim();
  const returnPin = digits(sellerInfo?.returnPincode || sellerInfo?.pincode).slice(0, 6);

  const missing = [];
  if (!pickupName) missing.push('name');
  if (pin.length !== 6) missing.push('pin');
  if (!phone) missing.push('phone');
  if (!email) missing.push('email');
  if (!registeredName) missing.push('registered_name');
  if (!sanitize(sellerInfo?.address)) missing.push('address');
  if (!sanitize(sellerInfo?.city)) missing.push('city');
  if (missing.length) {
    return { ok: false, error: `warehouse data missing required field(s): ${missing.join(', ')}` };
  }

  const body = {
    name: pickupName,
    registered_name: registeredName,
    address: sanitize(sellerInfo.address),
    city: sanitize(sellerInfo.city),
    state: sanitize(sellerInfo.state),
    country: 'India',
    pin,
    phone,
    email,
    return_address: sanitize(sellerInfo.returnAddress || sellerInfo.address),
    return_city: sanitize(sellerInfo.returnCity || sellerInfo.city),
    return_state: sanitize(sellerInfo.returnState || sellerInfo.state),
    return_pin: returnPin,
    return_country: 'India'
  };

  try {
    const resp = await fetch('https://track.delhivery.com/api/backend/clientwarehouse/create/', {
      method: 'POST',
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(body)
    });
    const text = await resp.text();
    let json = null;
    try { json = JSON.parse(text); } catch (_) { /* non-JSON response */ }
    const apiError = String(json?.error || '').trim();
    const ok = resp.ok && !!json && json.success !== false && !apiError;
    return {
      ok,
      error: ok ? '' : (apiError || `HTTP ${resp.status}: ${String(text || '').slice(0, 200) || 'no response'}`),
      response: json
    };
  } catch (err) {
    return { ok: false, error: `warehouse create call failed: ${err?.message || err}` };
  }
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
  const paymentMode = isCodOrder(order) ? 'cod' : 'prepaid';
  const codAmount = paymentMode === 'cod' ? resolveCodAmount(order) : 0;

  // --- 2. Build customer details ---
  // Shadowfax schema: contact/alternate_contact are strings (10-14 digits),
  // location_type enum is commercial|residential (NOT Home/Office).
  const customerContact = String(order.customerPhone || '').replace(/\D/g, '').slice(-10);
  const customerAlt = String(resolveAlternatePhone(order) || order.customerPhone || '').replace(/\D/g, '').slice(-10);
  const customerDetails = {
    name: order.customerName || '',
    contact: customerContact || '',
    address_line_1: order.addressLine1 || '',
    address_line_2: order.addressLine2 || order.landmark || '',
    city: order.city || '',    
    state: order.state || '',
    pincode: Number(order.pincode) || 0,
    alternate_contact: customerAlt || '',
    latitude: '00.0000',
    longitude: '00.0000',
    location_type: 'residential'
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
  // Schema: contact is string.
  const pickupContact = String(warehouse.phone || '').replace(/\D/g, '').slice(-10);
  const pickupDetails = {
    name: warehouse.name || '',
    contact: pickupContact || '',
    address_line_1: warehouse.address || '',
    address_line_2: '',
    city: warehouse.city || '',
    state: warehouse.state || '',
    pincode: Number(warehouse.pincode) || 0,
    latitude: '00.0000',
    longitude: '00.0000',
    pickup_type: 'seller',
  };

  // --- 4. Build RTO details (return address, fallback to warehouse) ---
  const rtoContact = String(warehouse.returnPhone || warehouse.phone || '').replace(/\D/g, '').slice(-10);
  const rtoDetails = {
    name: warehouse.name || '',
    contact: rtoContact || '',
    address_line_1: warehouse.returnAddress || warehouse.address || '',
    address_line_2: '',
    city: warehouse.returnCity || warehouse.city || '',
    state: warehouse.returnState || warehouse.state || '',
    pincode: Number(warehouse.returnPincode) || Number(warehouse.pincode) || 0,
    return_type: 'seller',
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
  // Schema: cod_amount must be 0 for prepaid; promised_delivery_date is
  // 'yyyy-MM-dd hh:mm:ss' (NOT ISO).
  const safeCodAmount = paymentMode === 'cod' ? Number(resolveCodAmount(order)) || 0 : 0;
  const fmtSfDate = (d) => {
    const dt = d ? new Date(d) : new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())} ${p(dt.getHours())}:${p(dt.getMinutes())}:${p(dt.getSeconds())}`;
  };
  return {
    order_type: 'marketplace',
    order_details: {
      client_order_id: order.referenceId || order.shopifyOrderId || '',
      actual_weight: pkg.deadWeight,
      volumetric_weight: pkg.volumetricWeight,
      product_value: parseFloat(parseFloat(subtotal).toFixed(2)),
      payment_mode: paymentMode,
      cod_amount: safeCodAmount,
      promised_delivery_date: fmtSfDate(order.expectedDeliveryDate || order.orderDate || new Date()),
      total_amount: parseFloat(totalAmount),
      discount: Number(discounts) || 0,
      shipping_charges: resolveShippingCharges(order) || Number(shipping) || 0,
      eway_bill: order.ewayBill || '',
      gstin_number: warehouse.gstTin || warehouse.gst || '',
      // Shadowfax validates delivery-pincode serviceability per order_service
      // tier. Sending our internal shippingMode (Air/Surface) decides nothing —
      // this is only the FIRST candidate; createShippmentShadowfox re-asks
      // serviceability for the pincode's real tier names and retries
      // (Regular/Surface/Air) until Shadowfax stops rejecting the value or
      // pincode (e.g. "Invalid Delivery Pincode ... not serviceble",
      // "Invalid order service").
      order_service: 'Regular'
    },
    customer_details: customerDetails, 
    pickup_details: pickupDetails,
    return_details: rtoDetails,
    product_details: productDetails
  };
}




  // Probe Shadowfax coverage for the pickup/delivery pincodes using the
  // account's valid service params (customer_delivery / seller_pickup —
  // 'marketplace'/'regular' return 400 Invalid Request).
  // → { delivery: {ok, services, raw?, error?}, pickup: {ok, services, raw?, error?} }
  // ok:false with a raw list = definitively NOT in coverage (empty []).
  async checkShadowfaxServiceability({ pickupPincode, deliveryPincode }) {
    const token = process.env.SHADOWFAX_TOKEN || '';
    const out = { delivery: { ok: false, services: [] }, pickup: { ok: false, services: [] } };
    const probes = [
      { key: 'delivery', service: 'customer_delivery', pin: String(deliveryPincode || '') },
      { key: 'pickup', service: 'seller_pickup', pin: String(pickupPincode || '') },
    ];
    for (const p of probes) {
      if (!p.pin || p.pin === '0') { out[p.key] = { ok: false, services: [], error: 'missing pincode' }; continue; }
      try {
        const url = `https://dale.shadowfax.in/api/v1/clients/serviceability/?service=${p.service}&pincodes=${encodeURIComponent(p.pin)}`;
        const r = await fetch(url, { headers: { 'Authorization': 'Token ' + token } });
        const j = await r.json().catch(() => null);
        const entry = Array.isArray(j) ? j.find((e) => String(e.code) === p.pin) : null;
        const services = Array.isArray(entry?.services) ? entry.services.filter(Boolean) : [];
        out[p.key] = { ok: services.length > 0, services, raw: Array.isArray(j) ? j : null };
      } catch (e) {
        out[p.key] = { ok: false, services: [], error: e?.message || String(e) };
      }
    }
    console.log(JSON.stringify(out), 'shadowfaxserviceability');
    return out;
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



         // Coverage pre-gate: serviceability is authoritative — if the pincode
         // is not in Shadowfax's list, no order_service value can succeed, so
         // fail fast with an actionable message instead of hammering the API.
         let tierHints = [];
         let svc = null;
         try {
           svc = await this.checkShadowfaxServiceability({
             pickupPincode: convertedOrder?.pickup_details?.pincode,
             deliveryPincode: convertedOrder?.customer_details?.pincode,
           });
         } catch (e) { console.log(e, 'shadowfaxserviceabilityskip'); }
         const notCovered = (leg) => leg && !leg.ok && !leg.error;
         if (svc && (notCovered(svc.delivery) || notCovered(svc.pickup))) {
           const isDelivery = notCovered(svc.delivery);
           const pin = isDelivery ? convertedOrder?.customer_details?.pincode : convertedOrder?.pickup_details?.pincode;
           const msg = `Invalid ${isDelivery ? 'Delivery' : 'Pickup'} Pincode. Pincode ${pin} is not serviceble for Shadowfax (not in its coverage list — neighbouring pincodes may work). Use another courier or ask Shadowfax to enable this pincode.`;
           console.log(JSON.stringify({ blocked: isDelivery ? 'delivery' : 'pickup', pin, svc }), 'shadowfaxblockedleg');
           return { message: msg, errors: msg };
         }
         // Tier names Shadowfax offers for this delivery pincode become the
         // first order_service candidates (docs enum = Regular; Surface also
         // accepted; Air is NOT enabled for this account → Invalid order service).
         if (Array.isArray(svc?.delivery?.services)) tierHints = svc.delivery.services;
         console.log(JSON.stringify(convertedOrder),"shadowfaxconvertedorder")                      
        // Candidate order_service tiers: whatever serviceability reports for
        // this delivery pincode first, then documented/generic names.
        // "Invalid order service" = value not accepted for this account;
        // pincode messages = tier does not cover the pincode. Both move on to
        // the next candidate instead of failing the shipment outright.
        const SHADOWFAX_ORDER_SERVICES = [...new Set([
          ...tierHints,
          'Regular', 'Surface',
        ])];
        const isRetryableRejection = (v) =>
          /not\s*service|invalid\s+delivery\s+pincode|invalid\s+order\s+service/i.test(
            typeof v === 'string' ? v : JSON.stringify(v || '')
          );
        let response = null;
        const orderServiceAttempts = [];
        for (let tierIdx = 0; tierIdx < SHADOWFAX_ORDER_SERVICES.length; tierIdx++) {
          const tier = SHADOWFAX_ORDER_SERVICES[tierIdx];
          if (tier === null || tier === undefined) {
            delete convertedOrder.order_details.order_service;
          } else {
            convertedOrder.order_details.order_service = tier;
          }
          const raw = await fetch('https://dale.shadowfax.in/api/v3/clients/orders/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Token ' + process.env.SHADOWFAX_TOKEN
            },
            body: JSON.stringify(convertedOrder)
          });
          response = await raw.json();
          const fmtDetail = (v) => {
            if (v === null || v === undefined || v === '') return '';
            if (typeof v === 'string') return v;
            try { return JSON.stringify(v); } catch (_) { return String(v); }
          };
          // On rejections Shadowfax sends message:"Failure" and puts the real
          // reason inside `errors` — always surface both.
          const attemptDetail = [fmtDetail(response?.message), fmtDetail(response?.errors), fmtDetail(response?.detail)]
            .filter(Boolean).join(' / ');
          console.log(JSON.stringify({ httpStatus: raw.status, order_service: tier, response }), "shadowfaxresponse", convertedOrder);
          const attemptLabel = (tier === null || tier === undefined) ? '(omitted)' : tier;
          orderServiceAttempts.push({
            order_service: attemptLabel,
            message: attemptDetail || JSON.stringify(response),
          });
          if (!isRetryableRejection(response)) break;
          console.log(JSON.stringify({
            client_order_id: convertedOrder?.order_details?.client_order_id,
            deliveryPincode: convertedOrder?.customer_details?.pincode,
            rejectedOrderService: attemptLabel
          }), 'shadowfaxtierfallback');
        }
        // Every candidate was rejected — return the full attempt trail so the
        // UI/support can see each order_service tried and Shadowfax's answer,
        // instead of only the last (often less relevant) message.
        if (response && isRetryableRejection(response)) {
          const summary = orderServiceAttempts
            .map((a) => `${a.order_service}: ${a.message}`)
            .join(' | ');
          const combinedMessage = `Shadowfax rejected all order_service candidates -> ${summary}`;
          response = {
            ...response,
            message: combinedMessage,
            // bulk-shipment flow surfaces `errors` (string) to the UI
            errors: combinedMessage,
            orderServiceAttempts,
          };
        }
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
      return {message:"Error creating shipment", errors:"Error creating shipment"}
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

         // Delhivery (Django backend) returns e.g. "ClientWarehouse matching query
         // does not exist." when the pickup_location name sent below is NOT
         // registered as a pickup warehouse on the Delhivery client account that
         // owns the token chosen by getAccountDetails() for this weight/zone
         // slug. Surface an actionable message instead of the raw cryptic error.
         const rawWaybill = response?.packages?.[0]?.waybill || response?.packages?.[0]?.wbn || null;
         const rawMessage = this._extractDelhiveryRemarks(response);
         if (!rawWaybill && /matching query does not exist|clientwarehouse/i.test(String(rawMessage))) {
           const pickupName = String(convertedOrder?.pickup_location?.name || '').trim();
           // Delhivery allows registering pickups via their API (one-time per
           // pickup). Auto-register the pickup, then retry shipment creation once.
           const ensure = await this._ensureDelhiveryClientWarehouse(tokendel, pickupName, sellerInfo, seller);
           if (ensure.ok) {
             console.log('Delhivery pickup auto-registered, retrying shipment create:', pickupName);
             const retryHttp = await fetch('https://track.delhivery.com/api/cmu/create.json', {
               method: 'POST',
               headers: {
                 Authorization: `Token ${tokendel}`,
                 'Content-Type': 'application/x-www-form-urlencoded'
               },
               body: formBody.toString()
             });
             const retryText = await retryHttp.text();
             try {
               const retryJson = JSON.parse(retryText);
               const retryWaybill = retryJson?.packages?.[0]?.waybill || retryJson?.packages?.[0]?.wbn || null;
               if (retryWaybill) {
                 console.log('Delhivery shipment created after pickup auto-registration:', retryWaybill);
                 return retryJson;
               }
               const retryMessage = this._extractDelhiveryRemarks(retryJson);
               return {
                 ...retryJson,
                 success: false,
                 message: `Delhivery pickup "${pickupName}" was registered, but shipment creation still failed: ${retryMessage || `HTTP ${retryHttp.status}`}`
               };
             } catch (_) {
               return {
                 success: false,
                 packages: [],
                 message: `Delhivery pickup "${pickupName}" was registered, but retry got a non-JSON response (HTTP ${retryHttp.status})`
               };
             }
           }
           return {
             ...response,
             packages: [],
             success: false,
             message:
               'Delhivery pickup location "' + pickupName + '" is not registered on the Delhivery account used for this weight/zone ' +
               'and auto-registration failed (' + ensure.error + '). ' +
               'Register this exact pickup name (case-sensitive) for ALL Delhivery account tokens in the Delhivery client portal, ' +
               'or rename the warehouse to match. Delhivery said: ' + rawMessage,
           };
         }

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





  _normalizeOrderStatus(status) {
    return String(status || '').toLowerCase().replace(/[_-]+/g, ' ').trim();
  }

  _isRtoLikeStatus(status) {
    const s = this._normalizeOrderStatus(status);
    return s.includes('rto') || s.includes('return to origin');
  }

  _isCancelledStatus(status) {
    const s = this._normalizeOrderStatus(status);
    return s.includes('cancelled') || s.includes('canceled');
  }

  _isOutForDeliveryStatus(status) {
    const s = this._normalizeOrderStatus(status);
    return s.includes('out for delivery') || s === 'ofd';
  }

  _isForwardDeliveredStatus(status) {
    const s = this._normalizeOrderStatus(status);
    return s.includes('delivered') && !s.includes('undeliver') && !this._isRtoLikeStatus(s);
  }

  /**
   * After pickup / in transit, cancel becomes RTO (keep forward freight,
   * deduct reverse charge, refund COD). Out for Delivery cannot be cancelled.
   * Pre-pickup (courier assigned / out for pickup / manifest / label etc.)
   * must NEVER become RTO — it becomes Cancelled with full freight refund.
   */
  _isPrePickupStatus(status) {
    const s = this._normalizeOrderStatus(status);
    if (!s) return true;
    return (
      s === 'pending' ||
      s.includes('pending') ||
      s.includes('processing') ||
      s.includes('ready for dispatch') ||
      s.includes('ready to ship') ||
      s.includes('courier assigned') ||
      s.includes('label created') ||
      s.includes('manifest') ||
      s.includes('pickup scheduled') ||
      s.includes('out for pickup') ||
      s.includes('pickups') ||
      s.includes('shipment expected') ||
      s.includes('rescheduled') ||
      s === 'shipped' ||
      s.includes('booked') ||
      s.includes('assigned')
    );
  }

  _trackingShowsActualPickupOrTransit(order) {
    const history = order?.tracking_history;
    if (!history) return null;
    const rows = Array.isArray(history) ? history : [history];
    const text = rows
      .map((item) => {
        if (item == null) return '';
        if (typeof item === 'string') return item;
        try {
          return JSON.stringify(item);
        } catch (_) {
          return String(item);
        }
      })
      .join(' ')
      .toLowerCase()
      .replace(/[_-]+/g, ' ');

    if (!text.trim()) return null;
    const hasActualPickupOrTransit =
      text.includes('picked up') ||
      text.includes('pickup complete') ||
      text.includes('pickup done') ||
      text.includes('in transit') ||
      text.includes('dispatched') ||
      text.includes('connected') ||
      text.includes('inscan') ||
      text.includes('hub');
    if (hasActualPickupOrTransit) return true;

    const hasOnlyPrePickup =
      text.includes('manifest') ||
      text.includes('label') ||
      text.includes('shipment created') ||
      text.includes('shipment expected') ||
      text.includes('pickup scheduled') ||
      text.includes('out for pickup') ||
      text.includes('assigned');
    if (hasOnlyPrePickup) return false;
    return null;
  }

  _isPostPickupRtoCancel(orderOrStatus) {
    const status = typeof orderOrStatus === 'object' ? orderOrStatus?.status : orderOrStatus;
    const s = this._normalizeOrderStatus(status);
    if (!s || this._isRtoLikeStatus(s) || this._isCancelledStatus(s)) return false;
    if (this._isForwardDeliveredStatus(s) || this._isOutForDeliveryStatus(s)) return false;
    // Anything before actual pickup stays a normal cancellation (refund + Cancelled).
    if (this._isPrePickupStatus(s)) return false;
    if (s.includes('out for pickup') || s.includes('pickup scheduled')) return false;

    const trackingDecision = this._trackingShowsActualPickupOrTransit(orderOrStatus);
    if (trackingDecision === false) return false;

    const isPickedUp =
      s === 'pickup' ||
      s.includes('picked up') ||
      s.includes('pickup complete') ||
      s.includes('pickup done');
    // NOTE: generic 'shipped' is intentionally NOT an RTO trigger — many
    // couriers set Shipped right after label/manifest, before any pickup.
    const isInTransit =
      s.includes('in transit') ||
      s.includes('dispatched');

    return isPickedUp || isInTransit || trackingDecision === true;
  }

  async _refundForwardFreight(order, description) {
    if (!order?.awb || order.awb === '-') return;

    // Duplicate refund guard: a Refund wallet row already exists for this order or AWB.
    const existingRefund = await Wallet.findOne({
      where: {
        status: 'Refund',
        [Op.or]: [
          { referenceId: order.referenceId },
          { transid: order.awb },
        ],
      },
    });
    if (existingRefund) {
      console.log(`[refund] Skipping duplicate refund for order ${order.referenceId || order.awb}`);
      return;
    }

    const user = await User.findByPk(order.seller);
    if (!user) return;

    const debit = await Wallet.findOne({ where: { transid: order.awb } });
    if (!debit) return;

    const amount = this._roundMoney(this._toMoney(debit.amount, 0));
    if (amount <= 0) return;

    const sequelize = Order.sequelize;
    const transaction = await sequelize.transaction();
    try {
      await Wallet.create({
        user_id: order.seller,
        status: 'Refund',
        description: description || `Shipment cancelled. AWB: ${order.awb}`,
        amount,
        transid: order.awb,
        referenceId: order.referenceId,
      }, { transaction });

      await User.update(
        { walletBalance: this._roundMoney(this._toMoney(user.walletBalance, 0) + amount) },
        { where: { id: order.seller }, transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async _finalizeCancelOrRto(order, { refundDescription } = {}) {
    const goRto = this._isPostPickupRtoCancel(order);
    const nextStatus = goRto ? 'RTO In transit' : 'Cancelled';

    // Keep AWB/courier/tracking on cancellation so they remain visible for records.
    // The Cancelled status still prevents them from leaking back into Courier-Assigned counts.
    await Order.update(
      {
        status: nextStatus,
        cancelledAt: new Date(),
        cancelReason: goRto
          ? 'Cancelled after pickup - RTO initiated'
          : 'Customer requested cancellation',
        // Explicitly re-assert shipment identifiers: a cancellation must NEVER
        // blank the AWB/courier/tracking out of the order record.
        awb: order.awb,
        courier: order.courier,
        trackingnumber: order.trackingnumber,
      },
      { where: { referenceId: order.referenceId } }
    );














    if (goRto) {
      const refreshed = await Order.findOne({ where: { referenceId: order.referenceId } });
      try {
        await this.deductAutoRtoCharge(refreshed || order);
      } catch (rtoErr) {
        console.error(
          `[cancelshipment] RTO charge failed for ${order.referenceId}:`,
          rtoErr?.message || rtoErr
        );
      }
      return {
        message: `Order no. ${order.referenceId} moved to RTO In Transit. RTO charge deducted and COD refunded.`,
        status: nextStatus,
        rto: true,
      };
    }


    await this._refundForwardFreight(order, refundDescription);
    return {
      message: `Order no. ${order.referenceId} cancelled successfully`,
      status: nextStatus,
      rto: false,
    };
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

    if (!Orderr) {
      throw new Error('Order not found');
    }

    if (this._isForwardDeliveredStatus(Orderr.status)) {
      return { message: 'Delivered orders cannot be cancelled' };
    }
    if (this._isOutForDeliveryStatus(Orderr.status)) {
      return { message: 'Out for Delivery shipments cannot be cancelled' };
    }
    if (this._isRtoLikeStatus(Orderr.status)) {
      return { message: 'Order is already in RTO' };
    }
    if (this._isCancelledStatus(Orderr.status)) {
      return { message: 'Order is already cancelled' };
    }

    const hasShipment = Orderr.awb && Orderr.awb !== '-' && Orderr.courier && Orderr.courier !== '-';
    if (!hasShipment) {
      await Order.update(
        {
          status: 'Cancelled',
          cancelledAt: new Date(),
          cancelReason: 'Customer requested cancellation',
        },
        { where: { referenceId: referenceId } }
      );
      return {
        message: "Order no. " + referenceId + " cancelled successfully",
        status: "Cancelled",
        rto: false,
      };
    }

    const shipment = await Shipment.findOne({ where: { referenceId } });
    const courierType = Orderr.courier || "delhivery";



    // console.log(Orderr,"OrderrOrderrOrderrOrderrOrderrOrderrOrderr")
    // return 



    //  if(Orderr.status=="Processing")
      
      
      
      {
     





    
    if (courierType === 'eKART' || courierType === 'Ekart' || courierType.toLowerCase().includes('ekart')) {
      const ekartTrackingId =
        shipment?.shipmenttracking?.tracking_id ||
        shipment?.shipmenttracking?.trackingId ||
        (Orderr.awb && Orderr.awb !== '-' ? Orderr.awb : null);
      if (!ekartTrackingId) {
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
            tracking_id: ekartTrackingId,
            reason: "Customer requested cancellation"
          }
        ]
      };
      
      
      let response = await fetch('https://app.elite.ekartlogistics.in/api/v1/package/cancel?tracking_id=' + ekartTrackingId, {
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
        
        return await this._finalizeCancelOrRto(Orderr, {
          refundDescription: "Shipment cancelled with eKART. AWB: " + Orderr.awb,
        });
      } else {
        return { message: response.message || "Failed to cancel eKART shipment" };
      }
    }
    else if (courierType.toLowerCase().includes('smc')) {
      if (!Orderr?.awb) {
        return { message: "No AWB found for Innufill shipment" };
      }

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
        
        return await this._finalizeCancelOrRto(Orderr, {
          refundDescription: "Shipment cancelled with SMC. AWB: " + Orderr.awb,
        });
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

        return await this._finalizeCancelOrRto(Orderr, {
          refundDescription: "Shipment cancelled with Delhivery. AWB: " + Orderr.awb,
        });
      } else {
        return { message: response.message || "Failed to cancel Delhivery shipment" };
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

        return await this._finalizeCancelOrRto(Orderr, {
          refundDescription: "Shipment cancelled with Shadowfax. AWB: " + Orderr.awb,
        });
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

        return await this._finalizeCancelOrRto(Orderr, {
          refundDescription: "Shipment cancelled with Xpressbees. AWB: " + Orderr.awb,
        });
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

        return await this._finalizeCancelOrRto(Orderr, {
          refundDescription: "Shipment cancelled with BlueDart. AWB: " + Orderr.awb,
        });
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
 * Cancelled orders still sync so the Shopify fulfillment can be cancelled
 * even after LogixMitra clears the AWB.
 */
syncShopifyOrder(order) {
  if (!order) return;
  if (String(order.platform || '').toLowerCase() !== 'shopify') return;
  const isCancelled = ['cancelled', 'canceled'].includes(
    String(order.status || '').trim().toLowerCase()
  );
  const awb = String(order.awb || '').trim();
  if (!isCancelled && (!awb || awb === '-')) return;
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
              const codcharge = this._toMoney(rateEntry?.codcharge?.[selectedIndex], 0);
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
        const rtoCharge = charge;
      
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
    codcharge,
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
    codcharge,
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
    codcharge,
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
    codcharge,
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
     codcharge,
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
    codcharge,
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
    codcharge,
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
  storeforcheck.push({message: (typeof response?.errors === "string" ? response.errors : JSON.stringify(response?.errors))})


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
              codcharge,
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
      // Only defined values are applied so a partial payload never wipes fields.
      const payload = Object.fromEntries(
        Object.entries({
          dispute_status: tmpdata.dispute_status,
          dispute_file_: tmpdata.dispute_file_,
          dispute_file: tmpdata.dispute_file,
          previousweight: tmpdata.previousweight,
          claimweight: tmpdata.claimweight,
          dispute_reason: tmpdata.dispute_reason,
        }).filter(([, value]) => value !== undefined)
      );

      const where = tmpdata.id
        ? { id: tmpdata.id }
        : tmpdata.awb
          ? { awb: tmpdata.awb }
          : { referenceId: tmpdata.referenceId };

      if (!where.id && !where.awb && !where.referenceId) {
        return { message: "Order identifier is required", status: 400 };
      }

      const order = await Order.findOne({ where });
      if (!order) {
        return { message: "Order not found", status: 400 };
      }

      const nextStatus = String(tmpdata.dispute_status || order.dispute_status || '');

      // Admin can delete a dispute entirely (clears every dispute field).
      if (tmpdata.action === 'delete' || /^delete$/i.test(nextStatus)) {
        await order.update({
          dispute_status: '',
          dispute_reason: '',
          dispute_file: '',
          dispute_file_: '',
          dispute_created_at: null,
          claimweight: '',
        });
        return { data: { deleted: 1 }, message: "success", status: 200 };
      }

      // Only claim weight provided → booked weight is taken from the order itself.
      if (/^disputed$/i.test(nextStatus) && !String(tmpdata.previousweight || '').trim()) {
        payload.previousweight = String(this._bookedWeightKg(order) ?? '');
      }

      // Seller reject must attach a proof that goes straight to the admin.
      if (/^in process$/i.test(nextStatus)) {
        const files = String(tmpdata.dispute_file || '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
        if (!files.length) {
          return { message: "Proof is required to reject a weight dispute", status: 400 };
        }
      }

      if (/^disputed$/i.test(nextStatus) && !order.dispute_created_at) {
        payload.dispute_created_at = new Date();
      }

      await order.update(payload);

      // Charge is deducted when the dispute is accepted (seller/admin) and when
      // the admin rejects the seller's proof (Rejection Rejected).
      if (/^(approved|accepted|rejection rejected)$/i.test(nextStatus)) {
        const deduct = await this.deductWeightDisputeCharge(order, {
          extraCharge: tmpdata.extraCharge,
          oldCharge: tmpdata.oldCharge,
          newCharge: tmpdata.newCharge,
          totalWeight: tmpdata.totalWeight,
          zone: tmpdata.zone || order.zone,
          warehouse: tmpdata.warehouse || order.warehouse,
        });
        if (deduct?.success === false && !deduct?.skipped) {
          // Keep the dispute reviewable instead of losing the admin's decision.
          await order.update({
            dispute_status: /^rejection rejected$/i.test(nextStatus) ? 'In Process' : 'Disputed',
          });
          return { message: deduct.reason || "Failed to deduct weight charge", status: 400, data: deduct };
        }
        return { data: { updated: 1, deduct }, message: "success", status: 200 };
      }

      return { data: { updated: 1 }, message: "success", status: 200 };
    }
    catch(e){
      return { message: e.message || "Error", status: 400 };
    }
  }

  _normalizeZoneKey(zone) {
    const raw = String(zone || '').toUpperCase().replace(/\s+/g, ' ').trim();
    if (!raw) return 'ZONE D';
    const letter = raw.replace(/^ZONE\s*/, '');
    if (/^[A-E]$/.test(letter)) return `ZONE ${letter}`;
    if (raw.startsWith('ZONE')) return raw;
    return raw;
  }

  _parseWeightDisputeMeta(reason) {
    const text = String(reason || '');
    const extraKg = Number(text.match(/extraKg\s*=\s*([\d.]+)/i)?.[1]);
    const extraCharge = Number(text.match(/extraCharge\s*=\s*([\d.]+)/i)?.[1]);
    const rupee = Number(text.match(/₹\s*([\d.]+)/)?.[1]);
    return {
      extraKg: Number.isFinite(extraKg) ? extraKg : null,
      extraCharge: Number.isFinite(extraCharge)
        ? extraCharge
        : Number.isFinite(rupee)
          ? rupee
          : null,
    };
  }

  _oldFreightCharge(order, bookedWeight = 0) {
    const chargecor = this._toMoney(order?.chargecor, 0);
    const b2b = this._toMoney(order?.b2bCharge, 0);
    const booked = Number(bookedWeight) || 0;
    const perKg = booked > 0 ? chargecor / booked : chargecor;
    // chargecor is sometimes the booked kg, not rupees.
    if (chargecor > 0 && perKg >= 8) return this._roundMoney(chargecor);
    if (b2b > 0) return this._roundMoney(b2b);
    if (chargecor > 0) return this._roundMoney(chargecor);
    return 0;
  }

  _extraChargeFromOldRate(order, extraKg, bookedWeight) {
    const extra = this._roundMoney(extraKg);
    const booked = this._toWeightKg(bookedWeight) ?? this._bookedWeightKg(order);
    const oldCharge = this._oldFreightCharge(order, booked);
    if (extra <= 0) {
      return { extraKg: extra, extraCharge: 0, oldCharge, bookedWeight: booked, method: 'none' };
    }
    if (!oldCharge || !booked || booked <= 0) {
      return { extraKg: extra, extraCharge: 0, oldCharge, bookedWeight: booked, method: 'missing_old_charge' };
    }
    return {
      extraKg: extra,
      extraCharge: this._roundMoney((oldCharge / booked) * extra),
      oldCharge,
      bookedWeight: booked,
      method: 'prorate_old_charge',
    };
  }

  _asRatechart(value) {
    if (!value) return null;
    let chart = value;
    if (typeof chart === 'string') {
      try {
        chart = JSON.parse(chart);
      } catch (err) {
        return null;
      }
    }
    return Array.isArray(chart) && chart.length >= 3 ? chart : null;
  }

  async _ratechartForOrder(order) {
    let userId = null;
    const warehouseId = order?.warehouse;
    if (warehouseId) {
      const warehouse = await Warehouse.findByPk(warehouseId);
      userId = warehouse?.user_id || null;
    }
    if (!userId) userId = order?.seller || order?.user_id || null;
    if (!userId) return null;
    const user = await User.findByPk(userId);
    return this._asRatechart(user?.ratechart);
  }

  _codChargeFromSlab(row, order) {
    if (String(order?.financialStatus || '').toLowerCase() !== 'pending') return 0;
    const amountNum = this._toMoney(String(order?.amount ?? '').replace(/[^0-9.-]/g, ''), 0);
    try {
      const parts = String(row?.[row.length - 1] ?? '')
        .toLowerCase()
        .replace(/\s|%/g, '')
        .split('|');
      const percentCharge = (amountNum / 100) * parseFloat(parts[1]);
      const flatCharge = parseFloat(parts[0]);
      const percent = Number.isFinite(percentCharge) ? percentCharge : 0;
      const flat = Number.isFinite(flatCharge) ? flat : 0;
      return percent > flat ? percent : flat;
    } catch (err) {
      return 0;
    }
  }

  _compactZone(value) {
    return this._normalizeZoneKey(value).replace(/[^A-Z0-9]/g, '');
  }

  _normCourier(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  // Resolves the rate-card rows, zone column and matched courier block shared by
  // every slab calculation below. Returns { reason } when it cannot be resolved.
  _resolveRatechartRows(ratechart, courier, zone) {
    const chart = this._asRatechart(ratechart);
    if (!chart) return { reason: 'Rate card is not readable' };

    const header = Array.isArray(chart[0]) ? chart[0] : [];
    const zoneKey = this._compactZone(zone);
    const zoneIdx = header.findIndex((col) => this._compactZone(col) === zoneKey);
    if (zoneIdx < 0) {
      return { reason: `Zone ${zone || '-'} is not on the warehouse rate card` };
    }

    const rawRows = chart.slice(2);
    let lastCourier = '';
    const rows = rawRows.map((row) => {
      const copy = Array.isArray(row) ? row.slice() : [];
      if (copy[0] != null && String(copy[0]).trim() !== '') lastCourier = copy[0];
      else if (lastCourier) copy[0] = lastCourier;
      return copy;
    });

    const courierName = String(courier || '').trim();
    const courierNorm = this._normCourier(courierName);
    const types = [];
    for (const row of rows) {
      const name = row?.[0];
      if (name != null && String(name).trim() !== '' && !types.includes(name)) types.push(name);
    }

    let matchedType = null;
    let bestScore = 0;
    for (const name of types) {
      const label = this._normCourier(name);
      if (!label || !courierNorm) continue;
      if (label === courierNorm) {
        matchedType = name;
        bestScore = 1000;
        break;
      }
      if (label.length < 4) continue;
      if (courierNorm.includes(label) || label.includes(courierNorm)) {
        const score = Math.min(label.length, courierNorm.length);
        if (score > bestScore) {
          matchedType = name;
          bestScore = score;
        }
      }
    }

    if (matchedType == null) {
      return { reason: `Courier ${courierName || '-'} was not found on the warehouse rate card` };
    }

    return { zoneIdx, rows, matchedType, courierName };
  }

  // Flat slab rate for a weight — the slab whose limit covers the weight, or a
  // progressive walk when the weight is above every defined slab.
  _lookupRatechartCharge(ratechart, courier, zone, weightKg, order = null) {
    const weight = Number(weightKg);
    if (!Number.isFinite(weight) || weight <= 0) {
      return { charge: null, reason: 'Claim weight is missing' };
    }

    const resolved = this._resolveRatechartRows(ratechart, courier, zone);
    if (resolved.reason) return { charge: null, reason: resolved.reason };
    const { zoneIdx, rows, matchedType, courierName } = resolved;

    const parseSlabKg = (label) =>
      this._toMoney(String(label || '').toLowerCase().replace(/per|kg|additional|\s/g, ''), 0);

    let max = 0;
    let ind = -1;
    let max2 = 0;
    let ind2 = -1;
    for (let j = 0; j < rows.length; j++) {
      if (rows[j]?.[0] != matchedType) continue;
      const tmax = parseSlabKg(rows[j]?.[1]);
      if (weight <= tmax && ind2 === -1) {
        ind2 = j;
        max2 = tmax;
      }
      if (tmax > max && weight >= tmax) {
        ind = j;
        max = tmax;
      }
    }
    if (ind === -1) {
      ind = ind2;
      max = max2;
    }
    if (ind < 0) {
      return { charge: null, reason: `No weight slab for ${courierName} at ${weight} kg` };
    }

    let freight = 0;
    const slabRow = rows[ind];
    if (max >= weight) {
      freight = this._toMoney(rows[ind][zoneIdx], 0);
    } else {
      const amount1 = this._toMoney(rows[ind][zoneIdx], 0);
      let next = rows[ind + 1];
      if (!next || next[0] != matchedType || this._toMoney(next[zoneIdx], 0) <= 0) {
        next = rows.slice(ind + 1).find((row) =>
          row?.[0] == matchedType &&
          /additional|per/i.test(String(row?.[1] || '')) &&
          this._toMoney(row[zoneIdx], 0) > 0
        );
      }
      const amount2 = this._toMoney(next?.[zoneIdx], 0);
      const step = parseSlabKg(next?.[1]);
      if (!next || amount2 <= 0 || step <= 0) {
        return { charge: null, reason: `No additional rate for ${courierName} above ${max} kg in ${zone}` };
      }
      let totalrate = amount1 + amount2;
      max += step;
      let totalcount = 0;
      while (totalcount <= 299) {
        totalcount += 1;
        if (max >= weight) {
          freight = totalrate;
          break;
        }
        max += step;
        totalrate += amount2;
      }
    }

    if (freight <= 0) {
      return { charge: null, reason: `Rate card has no ${zone} price for ${courierName}` };
    }
    const charge = freight + this._codChargeFromSlab(slabRow, order);
    return { charge: this._roundMoney(charge * 1.18), reason: null };
  }

  // Weight-dispute pricing. The order keeps the slab it was booked in and every
  // extra step is charged at that slab's "additional per kg" rate — never the
  // flat rate of a heavier slab.
  //
  //   booked 0.5 kg @ ₹50, additional 0.5 kg @ ₹25, claimed 2 kg
  //   → 0.5 @ 50 | 1.0 @ +25 | 1.5 @ +25 | 2.0 @ +25  = ₹125
  //   → dispute charge = 125 − 50 already paid = ₹75
  _progressiveSlabCharge(ratechart, courier, zone, bookedWeightKg, claimWeightKg, order = null) {
    const booked = Number(bookedWeightKg);
    const claim = Number(claimWeightKg);
    if (!Number.isFinite(booked) || booked <= 0) {
      return { charge: null, reason: 'Booked weight is missing' };
    }
    if (!Number.isFinite(claim) || claim <= 0) {
      return { charge: null, reason: 'Claim weight is missing' };
    }

    const resolved = this._resolveRatechartRows(ratechart, courier, zone);
    if (resolved.reason) return { charge: null, reason: resolved.reason };
    const { zoneIdx, rows, matchedType, courierName } = resolved;

    const parseSlabKg = (label) =>
      this._toMoney(String(label || '').toLowerCase().replace(/per|kg|additional|\s/g, ''), 0);

    // An "additional" row is one whose label says additional (e.g. "additional
    // Per .50 kg", "Additional 1 Kg"). Base slabs like "Per .50 kg" / "Per 5 Kg"
    // are NOT additional — matching bare "per" here wrongly discarded every
    // base slab, so progressive pricing fell back to the flat slab rate.
    const isAdditionalRow = (row) =>
      /additional/i.test(String(row?.[1] || ''));

    // The booked slab: the highest slab whose limit is <= the booked weight,
    // falling back to the first slab that already covers it.
    let baseIdx = -1;
    let baseLimit = 0;
    for (let j = 0; j < rows.length; j++) {
      if (rows[j]?.[0] != matchedType || isAdditionalRow(rows[j])) continue;
      const limit = parseSlabKg(rows[j]?.[1]);
      if (limit <= 0) continue;
      if (booked <= limit) {
        baseIdx = j;
        baseLimit = limit;
        break;
      }
      if (limit > baseLimit) {
        baseIdx = j;
        baseLimit = limit;
      }
    }
    if (baseIdx < 0) {
      return { charge: null, reason: `No weight slab for ${courierName} at ${booked} kg` };
    }

    const baseRate = this._toMoney(rows[baseIdx][zoneIdx], 0);
    if (baseRate <= 0) {
      return { charge: null, reason: `Rate card has no ${zone} price for ${courierName}` };
    }

    // Already inside the booked slab — nothing extra to charge.
    if (claim <= baseLimit) {
      return {
        charge: null,
        reason: `Claimed weight ${claim} kg is within the booked ${baseLimit} kg slab`,
      };
    }

    // The additional rate. The "Additional per kg" row is authoritative — that
    // is the per-step rate the courier charges above the base slab. Explicit
    // higher slab rows are NOT used as steps (their label is a limit, not an
    // increment); rate cards without an Additional row fall back to the flat
    // slab calculation in _calculateWeightDisputeCharge.
    //
    // Prefer the first additional row AFTER the booked slab (that is the step
    // rate for THIS slab); only fall back to any additional row on the card.
    const additionalRow =
      rows.slice(baseIdx + 1).find(
        (row) =>
          row?.[0] == matchedType && isAdditionalRow(row) && this._toMoney(row[zoneIdx], 0) > 0
      ) ||
      rows.find(
        (row) =>
          row?.[0] == matchedType && isAdditionalRow(row) && this._toMoney(row[zoneIdx], 0) > 0
      );

    const stepRate = this._toMoney(additionalRow?.[zoneIdx], 0);
    const stepKg = additionalRow ? parseSlabKg(additionalRow[1]) : 0;
    if (!additionalRow || stepRate <= 0 || stepKg <= 0) {
      return { charge: null, reason: `No additional rate for ${courierName} above ${baseLimit} kg in ${zone}` };
    }

    // Walk up one step at a time until the claimed weight is covered.
    let reached = this._roundMoney(baseLimit);
    let steps = 0;
    while (reached < claim && steps <= 1000) {
      reached = this._roundMoney(reached + stepKg);
      steps += 1;
    }

    const slabRow = rows[baseIdx];
    const codCharge = this._codChargeFromSlab(slabRow, order);
    const freight = this._roundMoney(baseRate + stepRate * steps + codCharge);

    return {
      charge: this._roundMoney(freight * 1.18),
      baseRate,
      stepRate,
      stepKg,
      steps,
      baseLimit,
      reason: null,
    };
  }

  async _calculateWeightDisputeCharge(order, bookedWeight, chargedWeight, extraKgOverride = null) {
    const extraKg = extraKgOverride != null && extraKgOverride > 0
      ? this._roundMoney(extraKgOverride)
      : this._roundMoney(chargedWeight - bookedWeight);
    const booked = this._roundMoney(bookedWeight);
    const totalWeight = this._roundMoney(booked + extraKg);
    const zone = order?.zone || '';
    const warehouseId = order?.warehouse || '';

    if (extraKg <= 0) {
      return { extraKg, extraCharge: 0, bookedWeight: booked, totalWeight, zone, warehouse: warehouseId, method: 'none' };
    }
    if (!zone || !warehouseId) {
      return {
        extraKg,
        extraCharge: 0,
        bookedWeight: booked,
        totalWeight,
        zone,
        warehouse: warehouseId,
        method: 'missing_zone_warehouse',
        reason: 'Zone or warehouse is not saved on the order',
      };
    }

    const ratechart = await this._ratechartForOrder(order);
    if (!ratechart) {
      return {
        extraKg,
        extraCharge: 0,
        bookedWeight: booked,
        totalWeight,
        zone,
        warehouse: warehouseId,
        method: 'missing_ratechart',
        reason: 'Rate card not found for the order warehouse',
      };
    }

    const claimKg = this._roundMoney(chargedWeight || totalWeight);
    // Price the claim from the booked slab upward, one additional step at a
    // time. Rate cards without an additional rate fall back to the flat slab.
    const progressive = this._progressiveSlabCharge(ratechart, order?.courier, zone, booked, claimKg, order);
    const lookedUp = progressive?.charge != null
      ? progressive
      : this._lookupRatechartCharge(ratechart, order?.courier, zone, claimKg, order);
    const newCharge = lookedUp?.charge ?? null;
    if (newCharge == null) {
      return {
        extraKg,
        extraCharge: 0,
        bookedWeight: booked,
        totalWeight: claimKg,
        oldCharge: null,
        newCharge,
        zone,
        warehouse: warehouseId,
        method: 'ratecard_miss',
        reason: lookedUp?.reason || 'Could not calculate freight from the rate card for this courier, zone and claim weight',
      };
    }

    const previousCharge = await this._previouslyDeductedCourierCharge(order, booked);
    if (!(previousCharge > 0)) {
      return {
        extraKg,
        extraCharge: 0,
        bookedWeight: booked,
        totalWeight: claimKg,
        oldCharge: previousCharge,
        newCharge,
        zone,
        warehouse: warehouseId,
        method: 'missing_previous_charge',
        reason: 'Previous courier charge was not found for this AWB',
      };
    }

    return {
      extraKg,
      extraCharge: this._roundMoney(Math.max(0, newCharge - previousCharge)),
      oldCharge: previousCharge,
      newCharge,
      bookedWeight: booked,
      totalWeight: claimKg,
      zone,
      warehouse: warehouseId,
      method: 'handleCalculate',
    };
  }

  async _previouslyDeductedCourierCharge(order, bookedWeight = 0) {
    const awb = String(order?.awb || '').trim();
    const validAwb = awb && awb !== '-';
    const refs = [
      validAwb ? { transid: awb } : null,
      order?.referenceId ? { referenceId: order.referenceId } : null,
    ].filter(Boolean);

    if (refs.length) {
      const debits = await Wallet.findAll({
        where: {
          status: 'Debited',
          [Op.or]: refs,
          description: { [Op.iLike]: '%Shipment created%' },
        },
        order: [['id', 'ASC']],
      });
      const matched = validAwb
        ? debits.filter((row) =>
            String(row.transid || '') === awb || String(row.description || '').includes(awb)
          )
        : debits;
      const rows = matched.length ? matched : debits;
      const deducted = this._roundMoney(
        rows.reduce((sum, row) => sum + this._toMoney(row.amount, 0), 0)
      );
      if (deducted > 0) return deducted;
    }

    return this._oldFreightCharge(order, bookedWeight);
  }

  async deductWeightDisputeCharge(orderInput, override = {}) {
    const order = orderInput?.id
      ? await Order.findByPk(orderInput.id)
      : orderInput;
    if (!order) return { success: false, skipped: true, reason: 'no_order' };

    const meta = this._parseWeightDisputeMeta(order.dispute_reason);
    const bookedWeight = this._bookedWeightKg(order);
    const claimedWeight = this._toWeightKg(order.claimweight);
    const extraKg =
      claimedWeight != null && bookedWeight != null
        ? this._roundMoney(claimedWeight - bookedWeight)
        : meta.extraKg != null && meta.extraKg > 0
          ? this._roundMoney(meta.extraKg)
          : this._roundMoney(Math.max(0, (claimedWeight || 0) - (bookedWeight || 0)));

    if (extraKg <= 0) {
      return { success: true, skipped: true, reason: 'no_extra_weight' };
    }

    const chargedWeight = claimedWeight || this._roundMoney((bookedWeight || 0) + extraKg);
    const calc = await this._calculateWeightDisputeCharge(order, bookedWeight, chargedWeight, extraKg);
    if (!(this._toMoney(calc.newCharge, 0) > 0)) {
      if (calc.method === 'none') {
        return { success: true, skipped: true, reason: 'no_extra_weight' };
      }
      return {
        success: false,
        reason: calc.reason || 'Could not calculate freight from claim weight',
      };
    }
    if (!(this._toMoney(calc.oldCharge, 0) > 0)) {
      return {
        success: false,
        reason: calc.reason || 'Previous courier charge was not found for this AWB',
      };
    }

    const extraCharge = this._toMoney(calc.extraCharge, 0);
    if (extraCharge <= 0) {
      return { success: true, skipped: true, reason: 'no_extra_charge', amount: 0, extraKg, calc };
    }

    // Slab breakdown so the passbook/print row explains how the charge was built.
    const slabBreakdown = calc.steps != null
      ? ` | slab=${calc.baseLimit}kg@₹${calc.baseRate}+${calc.steps}x${calc.stepKg}kg@₹${calc.stepRate}`
      : '';

    const existing = await Wallet.findOne({
      where: {
        [Op.or]: [
          { referenceId: order.referenceId },
          order.awb && order.awb !== '-' ? { transid: `WT-${order.awb}` } : null,
        ].filter(Boolean),
        status: 'Debited',
        description: { [Op.iLike]: '%Weight Dispute%' },
      },
    });
    if (existing) {
      return { success: true, skipped: true, reason: 'already_charged', amount: extraCharge };
    }

    const sellerId = order.seller || order.user_id;
    const seller = sellerId ? await User.findByPk(sellerId) : null;
    if (!seller) return { success: false, reason: 'Seller not found' };

    const balance = this._toMoney(seller.walletBalance, 0);
    if (balance < extraCharge) {
      return {
        success: false,
        reason: `Insufficient wallet balance (₹${balance.toFixed(2)})`,
      };
    }

    const newBalance = this._roundMoney(balance - extraCharge);
    await User.update({ walletBalance: newBalance }, { where: { id: sellerId } });
    await Wallet.create({
      user_id: sellerId,
      status: 'Debited',
      description: `Weight Dispute | zone=${calc.zone || order.zone || ''} | warehouse=${calc.warehouse || order.warehouse || ''} | bookedKg=${bookedWeight} | totalKg=${calc.totalWeight} | previousCourierCharge=₹${calc.oldCharge} | newCharge=₹${calc.newCharge} | extraKg=${extraKg} | ₹${extraCharge}${slabBreakdown}`,
      amount: extraCharge,
      referenceId: order.referenceId || null,
      orderNumber: order.orderNumber || null,
      transid: order.awb && order.awb !== '-' ? `WT-${order.awb}` : `WT-${order.referenceId}`,
    });
    await order.update({
      dispute_reason: `Weight Dispute | extraKg=${extraKg} | extraCharge=${extraCharge} | oldCharge=${calc.oldCharge} | newCharge=${calc.newCharge} | totalKg=${calc.totalWeight} | zone=${calc.zone || order.zone || ''}${slabBreakdown}`,
    });
    return { success: true, amount: extraCharge, extraKg, oldCharge: calc.oldCharge, newBalance };
  }

  async autoApproveExpiredWeightDisputes() {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const pending = await Order.findAll({
      where: {
        dispute_status: { [Op.iLike]: 'Disputed' },
      },
    });

    let approved = 0;
    let deducted = 0;
    let failed = 0;
    let skipped = 0;

    for (const order of pending) {
      try {
        if (!order.dispute_created_at) {
          await order.update({ dispute_created_at: new Date() });
          skipped += 1;
          continue;
        }

        if (new Date(order.dispute_created_at) > cutoff) {
          skipped += 1;
          continue;
        }

        const deduct = await this.deductWeightDisputeCharge(order);
        if (deduct?.success === false && !deduct?.skipped) {
          failed += 1;
          console.warn(
            `[weight-dispute-auto] ${order.referenceId || order.awb}: ${deduct.reason}`
          );
          continue;
        }

        await order.update({ dispute_status: 'Charged' });
        approved += 1;
        if (deduct?.amount > 0 && !deduct?.skipped) deducted += 1;
      } catch (err) {
        failed += 1;
        console.error(
          `[weight-dispute-auto] ${order.referenceId || order.awb}:`,
          err?.message || err
        );
      }
    }

    return {
      processed: pending.length,
      approved,
      deducted,
      failed,
      skipped,
    };
  }

  _toWeightKg(value) {
    if (value === null || value === undefined || value === '') return null;
    const raw = String(value).trim().toLowerCase();
    if (!raw) return null;
    const numeric = this._toMoney(raw.replace(/,/g, ''), null);
    if (numeric === null || numeric < 0) return null;
    // Explicit units always win: "3 Kg" -> 3, "500 g"/"500 gram" -> 0.5.
    if (/\bg\b|gram/.test(raw) && !/kg|kilo/.test(raw)) {
      return this._roundMoney(numeric / 1000);
    }
    if (/kg|kilo/.test(raw)) {
      return this._roundMoney(numeric);
    }
    // No unit: some couriers store grams (3000 = 3 kg), others kg (3.5).
    // Parcels are well under 100 kg, so a bare number >= 100 is grams.
    if (numeric >= 100) {
      return this._roundMoney(numeric / 1000);
    }
    return this._roundMoney(numeric);
  }

  // Booked (previous) weight is the chargeable weight — couriers bill on
  // whichever is higher, dead weight or volumetric weight. Take the max of
  // every available source so a stale/low stored previousweight can never
  // under-bill, and so the charge matches the weight shown in the UI.
  _bookedWeightKg(order) {
    const previous = this._toWeightKg(order?.previousweight);
    const dead = this._toWeightKg(order?.totalWeight);
    const volumetric = this._toWeightKg(order?.totalVolumetricWeight);
    const candidates = [previous, dead, volumetric].filter((v) => v != null && v > 0);
    return candidates.length ? this._roundMoney(Math.max(...candidates)) : null;
  }

  async processWeightDisputeUpload(rows = []) {
    const results = [];

    for (const row of rows) {
      const awb = String(row?.awb || row?.AWB || row?.waybill || '').trim();
      const referenceId = String(row?.referenceId || row?.reference_id || '').trim();
      const claimWeight = this._toWeightKg(
        row?.claimWeight ?? row?.claimweight ?? row?.claimedWeight
      );
      // Optional "Image Link/Image" column — shown to the seller on view.
      const imageLink = String(row?.imageLink ?? row?.image ?? '').trim();
      const imageList = imageLink
        ? imageLink.split(/[,|]+/).map((item) => item.trim()).filter(Boolean)
        : [];
      let chargedWeight = this._toWeightKg(
        row?.chargedWeight ?? row?.appliedWeight
      );
      const excelBooked = this._toWeightKg(
        row?.bookedWeight ?? row?.previousWeight ?? row?.deadWeight
      );
      const excelDifference = this._toWeightKg(
        row?.differenceWeight ?? row?.extraKg ?? row?.extraWeight ?? row?.weightDifference
      );

      if (!awb && !referenceId) {
        results.push({ success: false, reason: 'AWB is required' });
        continue;
      }

      try {
        const order = await Order.findOne({
          where: awb
            ? { [Op.or]: [{ awb }, { referenceId: awb }, { orderNumber: awb }] }
            : { referenceId },
        });

        if (!order) {
          results.push({
            awb: awb || referenceId,
            success: false,
            reason: 'Order not found',
          });
          continue;
        }

        // Never recreate or reset an existing dispute for the same AWB — a
        // settled/charged dispute would otherwise be flipped back to Disputed
        // (and its claim weight overwritten) on a re-upload of the same file.
        const existingDisputeStatus = String(order.dispute_status || '').trim();
        if (existingDisputeStatus) {
          results.push({
            awb: order.awb || awb,
            referenceId: order.referenceId,
            bookedWeight: this._bookedWeightKg(order),
            claimWeight,
            success: true,
            skipped: true,
            reason: `Skipped — a dispute already exists for this AWB (status: ${order.dispute_status})`,
          });
          continue;
        }

        const bookedWeight =
          excelBooked ??
          this._bookedWeightKg(order);

        // "Image Link/Image" column merged with any proofs already on the order.
        const existingProofs = String(order.dispute_file || '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
        const mergedProofs = [...new Set([...existingProofs, ...imageList])];
        const imagePayload = imageList.length
          ? {
              dispute_file: mergedProofs.join(','),
              dispute_file_: order.dispute_file_ || imageList[0] || '',
            }
          : {};

        if (claimWeight != null) {
          chargedWeight = claimWeight;
        }

        // Claim Weight is mandatory (template marks it with *). The legacy
        // "charged weight" column is accepted as the claim weight.
        if (chargedWeight == null) {
          results.push({
            awb: order.awb || awb,
            referenceId: order.referenceId,
            success: false,
            reason: 'Claim Weight is required',
          });
          continue;
        }

        if (bookedWeight === null || bookedWeight <= 0) {
          results.push({
            awb: order.awb || awb,
            referenceId: order.referenceId,
            claimWeight,
            chargedWeight,
            differenceWeight: excelDifference,
            success: false,
            reason: 'Booked weight not found on order or Excel',
          });
          continue;
        }

        const extraKg =
          claimWeight != null
            ? this._roundMoney(claimWeight - bookedWeight)
            : excelDifference != null && excelDifference > 0
              ? excelDifference
              : this._roundMoney((chargedWeight ?? 0) - bookedWeight);
        if (extraKg <= 0) {
          results.push({
            awb: order.awb || awb,
            referenceId: order.referenceId,
            bookedWeight,
            claimWeight: chargedWeight,
            chargedWeight,
            extraKg,
            differenceWeight: extraKg,
            extraCharge: 0,
            success: true,
            skipped: true,
            reason: 'No extra weight',
          });
          continue;
        }

        if (chargedWeight === null) {
          chargedWeight = this._roundMoney(bookedWeight + extraKg);
        }

        const calc = await this._calculateWeightDisputeCharge(
          order,
          bookedWeight,
          chargedWeight,
          extraKg
        );
        const extraCharge = this._toMoney(calc.extraCharge, 0);

        if (calc.method !== 'handleCalculate') {
          results.push({
            awb: order.awb || awb,
            referenceId: order.referenceId,
            bookedWeight,
            claimWeight: chargedWeight,
            chargedWeight,
            extraKg,
            differenceWeight: extraKg,
            extraCharge: 0,
            success: false,
            reason: calc.reason || 'Could not calculate freight from booked weight and claim weight using the order zone and warehouse.',
          });
          continue;
        }

        if (extraCharge <= 0) {
          await order.update({
            previousweight: String(bookedWeight),
            claimweight: String(chargedWeight),
            dispute_status: 'Disputed',
            dispute_reason: `Weight Dispute | extraKg=${extraKg} | extraCharge=0 | oldCharge=${calc.oldCharge} | newCharge=${calc.newCharge}`,
            ...(order.dispute_created_at ? {} : { dispute_created_at: new Date() }),
            ...imagePayload,
          });
          results.push({
            awb: order.awb || awb,
            referenceId: order.referenceId,
            bookedWeight,
            claimWeight: chargedWeight,
            chargedWeight,
            extraKg,
            differenceWeight: extraKg,
            extraCharge: 0,
            success: true,
            reason: `Dispute created. Claim-weight charge ₹${calc.newCharge} is not above the ₹${calc.oldCharge} already deducted`,
          });
          continue;
        }

        // Create dispute only. Wallet is deducted later on charge approve/accept.
        await order.update({
          previousweight: String(bookedWeight),
          claimweight: String(chargedWeight),
          dispute_status: 'Disputed',
          dispute_reason: `Weight Dispute | extraKg=${extraKg} | extraCharge=${extraCharge}`,
          ...(order.dispute_created_at ? {} : { dispute_created_at: new Date() }),
          ...imagePayload,
        });

        results.push({
          awb: order.awb || awb,
          referenceId: order.referenceId,
          bookedWeight,
          claimWeight: chargedWeight,
          chargedWeight,
          extraKg,
          differenceWeight: extraKg,
          extraCharge,
          success: true,
          reason: 'Dispute created — pending charge approval',
        });
      } catch (error) {
        results.push({
          awb: awb || referenceId,
          success: false,
          reason: error.message || 'Failed to process row',
        });
      }
    }

    const created = results.filter((r) => r.success && !r.skipped);
    return {
      processed: results.length,
      deductedCount: 0,
      createdCount: created.length,
      skippedCount: results.filter((r) => r.skipped).length,
      failedCount: results.filter((r) => !r.success).length,
      deductedAmount: 0,
      pendingAmount: this._roundMoney(
        created.reduce((sum, r) => sum + this._toMoney(r.extraCharge, 0), 0)
      ),
      results,
    };
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
      attributes: ['id', 'referenceId', 'status', 'awb', 'courier'],
    });
    const foundById = new Map(orders.map((order) => [order.id, order]));
    const results = [];

    for (const id of uniqueIds) {
      const order = foundById.get(id);
      if (!order) {
        results.push({ id, success: false, reason: 'Order not found or access denied' });
        continue;
      }
      if (this._isForwardDeliveredStatus(order.status)) {
        results.push({
          id,
          referenceId: order.referenceId,
          success: false,
          reason: 'Delivered orders cannot be cancelled',
        });
        continue;
      }
      if (this._isOutForDeliveryStatus(order.status)) {
        results.push({
          id,
          referenceId: order.referenceId,
          success: false,
          reason: 'Out for Delivery shipments cannot be cancelled',
        });
        continue;
      }
      if (this._isRtoLikeStatus(order.status)) {
        results.push({
          id,
          referenceId: order.referenceId,
          success: false,
          reason: 'Order is already in RTO',
        });
        continue;
      }
      if (this._isCancelledStatus(order.status)) {
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
        let nextStatus = 'Cancelled';
        if (!hasShipment) {
          await order.update({
            status: 'Cancelled',
            cancelledAt: new Date(),
            cancelReason: reason,
          });
        } else {
          const response = await this.cancelshipment(order.referenceId);
          const refreshed = await Order.findByPk(order.id, { attributes: ['status'] });
          nextStatus = refreshed?.status || response?.status;
          const accepted =
            this._isCancelledStatus(nextStatus) || this._isRtoLikeStatus(nextStatus);
          if (!accepted) {
            results.push({
              id,
              referenceId: order.referenceId,
              success: false,
              reason: response?.message || 'Courier cancellation failed',
            });
            continue;
          }
        }
        this.syncShopifyOrderByReference(order.referenceId, nextStatus);
        results.push({
          id,
          referenceId: order.referenceId,
          success: true,
          status: nextStatus,
          rto: this._isRtoLikeStatus(nextStatus),
        });
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
      rtoCount: results.filter((result) => result.success && result.rto).length,
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

      const isCod =
        String(target.financialStatus || '').toLowerCase() === 'pending' ||
        String(target.paymentGateway || '').toUpperCase().includes('COD');
      const codRefund = this._toMoney(target.codcharge, 0);
      let finalBalance = newBalance;
      if (isCod && codRefund > 0) {
        const existingCod = await Wallet.findOne({
          where: {
            referenceId,
            status: 'Refund',
            description: { [Op.iLike]: '%COD refund%' },
          },
          transaction,
        });
        if (!existingCod) {
          finalBalance = this._roundMoney(finalBalance + codRefund);
          await User.update(
            { walletBalance: finalBalance },
            { where: { id: sellerId }, transaction }
          );
          await Wallet.create(
            {
              user_id: sellerId,
              status: 'Refund',
              description: 'COD refund on RTO',
              amount: codRefund,
              referenceId: referenceId || null,
              orderNumber: target.orderNumber || null,
              transid: target.awb ? `CODREF-${target.awb}` : `CODREF-${referenceId || Date.now()}`,
            },
            { transaction }
          );
        }
      }

      await transaction.commit();
      target.rtoCharged = true;

      console.log(
        `[deductAutoRtoCharge] Deducted ${amount} for order ${referenceId}, COD refund ${isCod ? codRefund : 0}, new balance ${finalBalance}`
      );
      return { success: true, amount, codRefund: isCod ? codRefund : 0, newBalance: finalBalance };
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
  /**
   * Exact server-side status-chip counts.
   * Runs the SAME getAllOrders where-builder per status chip (with the caller's
   * search/platform/courier/date/direction filters) so the chip number always
   * matches the list that opens on clicking the chip.
   * Dashboard cards reuse this too (baseFilters without user scoping replaced
   * by the dashboard's own scope) so dashboard == Orders page.
   */
  async getStatusCounts(baseFilters = {}) {
    const chips = [
      'Pending',
      'READY FOR DISPATCH',
      'Out for Pickup',
      'In Transit',
      'Out for Delivery',
      'Delivered',
      'UNDELIVERED',
      'RTO In transit',
      'RTO Delivered',
      'Cancelled',
      'all',
    ];
    const counts = {};
    for (const chip of chips) {
      const filters = { ...baseFilters, paginate: false, countOnly: true };
      if (chip === 'all') {
        delete filters.status;
      } else {
        filters.status = chip;
      }
      // countOnly + paginate:false returns a raw number (see getAllOrders).
      // eslint-disable-next-line no-await-in-loop
      counts[chip] = await this.getAllOrders(filters);
    }
    counts.all = counts.all ?? 0;
    return counts;
  }

  /**
   * Dashboard cards, computed with the SAME getAllOrders where-builder as the
   * Orders page chips. scopeWhere is the dashboard's user/freight scope
   * (baseWhereConditions in data_controller), so every card matches the
   * corresponding Orders tab exactly.
   * The "Courier Assigned" card intentionally combines two chips:
   * "Courier Assigned" + "Pickups & Manifests".
   */
  async getDashboardBuckets(scopeWhere = {}) {
    const scope = scopeWhere && typeof scopeWhere === 'object' ? scopeWhere : {};
    // NOTE: scopeWhere is a Sequelize where object (baseWhereConditions), NOT
    // flat getAllOrders filters — spread would leak Op keys into filters and be
    // ignored. Pass it explicitly so user/freight scope always applies.
    const run = (status) =>
      this.getAllOrdersWithScope(scope, {
        ...(status ? { status } : {}),
        paginate: false,
        countOnly: true,
      });
    const [
      newOrders,
      courierAssigned,
      pickupsAndManifests,
      inTransit,
      outForDelivery,
      delivered,
      undelivered,
      rtoInTransit,
      rtoDelivered,
      cancelled,
    ] = await Promise.all([
      run('Pending'),
      run('READY FOR DISPATCH'),
      run('Out for Pickup'),
      run('In Transit'),
      run('Out for Delivery'),
      run('Delivered'),
      run('UNDELIVERED'),
      run('RTO In transit'),
      run('RTO Delivered'),
      run('Cancelled'),
    ]);
    // RTO card == Orders page "RTO In-Transit" + "RTO Delivered" chips.
    // NOTE: exact status 'RTO' rows are ALREADY inside the "RTO In transit"
    // chip (its where-builder matches iLike 'RTO'), so a separate legacy
    // run('RTO') count would double-count them (281 vs 213 in prod).
    const rto = Number(rtoInTransit || 0) + Number(rtoDelivered || 0);
    return {
      newOrders: Number(newOrders || 0),
      // Dashboard "Courier Assigned" card = Orders page "Courier Assigned"
      // chip + "Pickups & Manifests" chip combined. The two where-builders are
      // mutually exclusive (the courier-assigned builder excludes %pickup% /
      // %manifest%), so the sum never double counts an order.
      courierAssigned:
        Number(courierAssigned || 0) + Number(pickupsAndManifests || 0),
      inTransit: Number(inTransit || 0),
      outForDelivery: Number(outForDelivery || 0),
      delivered: Number(delivered || 0),
      undelivered: Number(undelivered || 0),
      rto,
      cancelled: Number(cancelled || 0),
    };
  }

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

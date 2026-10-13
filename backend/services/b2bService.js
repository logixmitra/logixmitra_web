const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const {
  B2bRateCard,
  Order,
  OrderItem,
  User,
  Wallet,
  Warehouse,
  Shipment,
  FreightConsignment,
} = require('../models');
const { resolveUniqueReferenceId } = require('../utils/orderReference');

const VOL_DIVISOR_DEFAULT = 5000;
const ZONES = ['ZONE A', 'ZONE B', 'ZONE C', 'ZONE D', 'ZONE E'];

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function normalizePaymentMode(mode) {
  const m = String(mode || 'PREPAID').toUpperCase().replace(/\s+/g, '-');
  if (m === 'COD' || m === 'CASH-ON-DELIVERY-(COD)' || m.includes('COD')) return 'COD';
  if (m === 'TO-PAY' || m === 'TOPAY' || m === 'TO_PAY') return 'To-Pay';
  return 'Prepaid';
}

function calcBoxWeights(box, divisor = VOL_DIVISOR_DEFAULT) {
  const length = Number(box.length) || 0;
  const width = Number(box.width) || 0;
  const height = Number(box.height) || 0;
  const deadWeight = Number(box.deadWeight) || 0;
  const volumetricWeight =
    box.volumetricWeight != null
      ? Number(box.volumetricWeight)
      : length && width && height
        ? round2((length * width * height) / divisor)
        : 0;
  const chargeable = Math.max(deadWeight, volumetricWeight);
  return { length, width, height, deadWeight, volumetricWeight, chargeable };
}

function summarizePackages(packages = [], divisor = VOL_DIVISOR_DEFAULT) {
  const boxes = (Array.isArray(packages) ? packages : []).map((box, idx) => {
    const w = calcBoxWeights(box, divisor);
    return {
      boxNo: box.boxNo || idx + 1,
      ...w,
    };
  });
  const totalDead = round2(boxes.reduce((s, b) => s + b.deadWeight, 0));
  const totalVol = round2(boxes.reduce((s, b) => s + b.volumetricWeight, 0));
  const chargeableWeight = round2(boxes.reduce((s, b) => s + b.chargeable, 0));
  return { boxes, totalDead, totalVol, chargeableWeight };
}

function resolveFallbackZone(originMeta = {}, destMeta = {}) {
  const oCity = String(originMeta.city || '').toLowerCase();
  const dCity = String(destMeta.city || '').toLowerCase();
  const oState = String(originMeta.state || '').toLowerCase();
  const dState = String(destMeta.state || '').toLowerCase();
  if (oCity && dCity && oCity === dCity && oState === dState) return 'ZONE A';
  if (oState && dState && oState === dState) return 'ZONE B';
  return 'ZONE D';
}

function quoteFromCard(card, { zone, chargeableWeight, paymentMode, invoiceValue }) {
  const slabs = card.slabs || {};
  const zoneKey = ZONES.includes(zone) ? zone : 'ZONE D';
  const slab = slabs[zoneKey] || slabs['ZONE D'] || slabs['ZONE B'] || Object.values(slabs)[0];
  if (!slab) {
    return null;
  }

  const perKg = Number(slab.perKg) || 0;
  const minCharge = Number(slab.minCharge) || 0;
  const codPercent = Number(slab.codPercent) || 0;
  const odaSurcharge = Number(slab.odaSurcharge) || 0;
  const minWeight = Number(card.minWeightKg) || 0;
  const billableKg = Math.max(chargeableWeight, minWeight, 0.5);
  let freight = Math.max(minCharge, round2(billableKg * perKg)) + odaSurcharge;
  freight = round2(freight);

  let codCharge = 0;
  if (paymentMode === 'COD') {
    codCharge = round2(((Number(invoiceValue) || 0) * codPercent) / 100);
  }

  const gstPercent = Number(card.gstPercent) || 18;
  const taxable = freight + (paymentMode === 'COD' ? codCharge : 0);
  const gst = round2((taxable * gstPercent) / 100);
  const total = round2(taxable + gst);

  return {
    rateCardId: card.id,
    name: card.name,
    courierName: card.courierName,
    mode: card.mode,
    zone: zoneKey,
    chargeableWeight: billableKg,
    freight,
    codCharge,
    gstPercent,
    gst,
    total,
    paymentMode,
    debitAmount: paymentMode === 'To-Pay' ? 0 : total,
  };
}

async function listRateCards({ mode, activeOnly = false } = {}) {
  const where = {};
  if (mode) where.mode = mode;
  if (activeOnly) where.isActive = true;
  return B2bRateCard.findAll({ where, order: [['id', 'DESC']] });
}

async function createRateCard(payload) {
  return B2bRateCard.create({
    name: payload.name,
    courierName: payload.courierName,
    mode: payload.mode || 'MPS',
    slabs: payload.slabs || {},
    volumetricDivisor: payload.volumetricDivisor || VOL_DIVISOR_DEFAULT,
    gstPercent: payload.gstPercent != null ? payload.gstPercent : 18,
    minWeightKg: payload.minWeightKg != null ? payload.minWeightKg : 0,
    isActive: payload.isActive !== false,
    effectiveFrom: payload.effectiveFrom || null,
    notes: payload.notes || null,
  });
}

async function updateRateCard(id, payload) {
  const card = await B2bRateCard.findByPk(id);
  if (!card) throw new Error('Rate card not found');
  await card.update({
    name: payload.name ?? card.name,
    courierName: payload.courierName ?? card.courierName,
    mode: payload.mode ?? card.mode,
    slabs: payload.slabs ?? card.slabs,
    volumetricDivisor: payload.volumetricDivisor ?? card.volumetricDivisor,
    gstPercent: payload.gstPercent ?? card.gstPercent,
    minWeightKg: payload.minWeightKg ?? card.minWeightKg,
    isActive: payload.isActive ?? card.isActive,
    effectiveFrom: payload.effectiveFrom !== undefined ? payload.effectiveFrom : card.effectiveFrom,
    notes: payload.notes !== undefined ? payload.notes : card.notes,
  });
  return card;
}

async function deleteRateCard(id) {
  const card = await B2bRateCard.findByPk(id);
  if (!card) throw new Error('Rate card not found');
  await card.destroy();
  return true;
}

async function quote({
  originPincode,
  deliveryPincode,
  packages,
  weight,
  dimensions,
  paymentMode,
  invoiceValue,
  zone,
  originMeta,
  destMeta,
  mode = 'MPS',
}) {
  const payment = normalizePaymentMode(paymentMode);
  let resolvedZone = zone;
  if (!resolvedZone || resolvedZone === 'Zone not found') {
    resolvedZone = resolveFallbackZone(originMeta, destMeta);
  }

  const cards = await listRateCards({ mode, activeOnly: true });
  const quotes = [];

  for (const card of cards) {
    const divisor = card.volumetricDivisor || VOL_DIVISOR_DEFAULT;
    let pkgSummary;
    if (Array.isArray(packages) && packages.length > 0) {
      pkgSummary = summarizePackages(packages, divisor);
    } else {
      const single = summarizePackages(
        [
          {
            boxNo: 1,
            length: dimensions?.length,
            width: dimensions?.width,
            height: dimensions?.height,
            deadWeight: weight,
          },
        ],
        divisor
      );
      pkgSummary = single;
    }

    const q = quoteFromCard(card, {
      zone: resolvedZone,
      chargeableWeight: pkgSummary.chargeableWeight,
      paymentMode: payment,
      invoiceValue,
    });
    if (q) {
      quotes.push({
        ...q,
        packages: pkgSummary.boxes,
        originPincode,
        deliveryPincode,
      });
    }
  }

  quotes.sort((a, b) => a.total - b.total);
  return {
    zone: resolvedZone,
    paymentMode: payment,
    quotes,
  };
}

async function createB2bOrder(payload, actorUserId) {
  const userId = payload.user_id || actorUserId;
  if (!userId) throw new Error('user_id is required');

  const packages = Array.isArray(payload.packages) ? payload.packages : [];
  if (packages.length === 0) throw new Error('At least one package/box is required');

  const payment = normalizePaymentMode(payload.paymentGateway || payload.paymentMode);
  if (payment === 'To-Pay' && !payload.billingParty) {
    payload.billingParty = 'consignee';
  }

  const summary = summarizePackages(packages);
  const referenceId = await resolveUniqueReferenceId(payload.referenceId);
  const orderNumber =
    payload.orderNumber ||
    `B2B-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 1000)}`;

  let warehouseId = payload.warehouse || null;
  if (!warehouseId) {
    const wh = await Warehouse.findOne({
      where: { user_id: userId, isActive: true },
      order: [['isDefault', 'DESC'], ['id', 'ASC']],
    });
    warehouseId = wh?.id || null;
  }

  const items = Array.isArray(payload.items) && payload.items.length
    ? payload.items
    : [
        {
          name: payload.productName || 'B2B Consignment',
          unitPrice: Number(payload.invoiceValue) || 0,
          quantity: 1,
          gstRate: 0,
          totalPrice: Number(payload.invoiceValue) || 0,
          length: packages[0]?.length || 0,
          width: packages[0]?.width || 0,
          height: packages[0]?.height || 0,
          deadWeight: summary.totalDead,
          volumetricWeight: summary.totalVol,
        },
      ];

  const order = await Order.create({
    id: uuidv4(),
    user_id: userId,
    orderNumber,
    referenceId,
    orderType: payload.orderType || 'B2B_MPS',
    freightMode: payload.freightMode || null,
    packages: summary.boxes,
    customerName: payload.customerName || null,
    customerPhone: payload.customerPhone || null,
    customerEmail: payload.customerEmail || null,
    seller: payload.seller ? String(payload.seller) : null,
    courier: '-',
    status: 'Pending',
    amount: payload.invoiceValue != null ? String(payload.invoiceValue) : null,
    warehouse: warehouseId,
    orderDate: payload.orderDate || new Date().toISOString().slice(0, 10),
    platform: 'Manual',
    pincode: payload.pincode || payload.deliveryPincode || null,
    city: payload.city || null,
    state: payload.state || null,
    addressLine1: payload.addressLine1 || null,
    addressLine2: payload.addressLine2 || null,
    landmark: payload.landmark || null,
    shippingAddress: payload.shippingAddress || {
      name: payload.customerName,
      phone: payload.customerPhone,
      addressLine1: payload.addressLine1,
      addressLine2: payload.addressLine2,
      city: payload.city,
      state: payload.state,
      pincode: payload.pincode || payload.deliveryPincode,
    },
    totalItems: items.reduce((s, i) => s + (Number(i.quantity) || 0), 0),
    totalWeight: summary.totalDead,
    totalVolumetricWeight: summary.totalVol,
    paymentGateway: payment,
    financialStatus: payment === 'COD' ? 'pending' : 'paid',
    totalOutstanding: payment === 'COD' ? Number(payload.invoiceValue) || 0 : 0,
    billingParty: payload.billingParty || (payment === 'To-Pay' ? 'consignee' : 'shipper'),
    b2bCharge: payload.b2bCharge != null ? Number(payload.b2bCharge) : null,
    b2bRateCardId: payload.b2bRateCardId || null,
    manualBooking: false,
    consigneeGstin: payload.consigneeGstin || null,
    ewayBill: payload.ewayBill || null,
    appointmentAt: payload.appointmentAt || null,
    zone: payload.zone || null,
    subtotalPrice: Number(payload.invoiceValue) || 0,
  });

  for (const item of items) {
    await OrderItem.create({
      id: uuidv4(),
      orderId: order.id,
      name: item.name || 'Item',
      unitPrice: Number(item.unitPrice) || 0,
      quantity: Number(item.quantity) || 1,
      gstRate: Number(item.gstRate) || 0,
      totalPrice: Number(item.totalPrice) || 0,
      length: Number(item.length) || 0,
      width: Number(item.width) || 0,
      height: Number(item.height) || 0,
      deadWeight: Number(item.deadWeight) || 0,
      volumetricWeight: Number(item.volumetricWeight) || 0,
    });
  }

  return Order.findByPk(order.id, { include: [{ model: OrderItem, as: 'items' }] });
}

async function bookB2bOrder(orderId, body, actorUserId) {
  const order = await Order.findByPk(orderId);
  if (!order) throw new Error('Order not found');
  if (!['B2B_MPS', 'B2B_FREIGHT'].includes(order.orderType)) {
    throw new Error('Not a B2B order');
  }

  const awb = String(body.awb || '').trim();
  if (!awb) throw new Error('AWB / LR number is required');

  const courierName = String(body.courierName || body.courier || '').trim();
  if (!courierName) throw new Error('Courier name is required');

  let quoteResult = body.quote || null;
  if (!quoteResult && body.rateCardId) {
    const card = await B2bRateCard.findByPk(body.rateCardId);
    if (!card) throw new Error('Rate card not found');
    const payment = normalizePaymentMode(order.paymentGateway);
    const summary = summarizePackages(order.packages || [], card.volumetricDivisor || VOL_DIVISOR_DEFAULT);
    quoteResult = quoteFromCard(card, {
      zone: body.zone || order.zone || 'ZONE D',
      chargeableWeight: summary.chargeableWeight,
      paymentMode: payment,
      invoiceValue: Number(order.amount) || Number(order.subtotalPrice) || 0,
    });
  }

  if (!quoteResult) throw new Error('Quote / rateCardId is required to book');

  const payment = normalizePaymentMode(order.paymentGateway);
  const debitAmount = payment === 'To-Pay' ? 0 : Number(quoteResult.total) || 0;
  const userId = order.user_id || actorUserId;
  const user = await User.findByPk(userId);
  if (!user) throw new Error('Seller not found');

  if (debitAmount > 0) {
    const balance = Number(user.walletBalance) || 0;
    if (balance < debitAmount) {
      throw new Error(`Insufficient wallet balance. Required ₹${debitAmount}, available ₹${balance}`);
    }
    const newBalance = round2(balance - debitAmount);
    await user.update({ walletBalance: newBalance });
    await Wallet.create({
      user_id: userId,
      transid: awb,
      orderNumber: order.orderNumber,
      referenceId: order.referenceId,
      amount: -debitAmount,
      status: 'success',
      description: `B2B shipment booked (${courierName}). AWB: ${awb}`,
    });
  }

  await order.update({
    awb,
    courier: courierName,
    status: 'READY FOR DISPATCH',
    chargecor: String(quoteResult.total),
    b2bCharge: quoteResult.freight,
    b2bRateCardId: quoteResult.rateCardId || body.rateCardId || order.b2bRateCardId,
    manualBooking: true,
    zone: quoteResult.zone || order.zone,
    billingParty: payment === 'To-Pay' ? (order.billingParty || 'consignee') : (order.billingParty || 'shipper'),
    totalShippingPrice: quoteResult.total,
  });

  await Shipment.create({
    orderNumber: order.orderNumber,
    referenceId: order.referenceId,
    shipmentjson: {
      manual: true,
      b2b: true,
      awb,
      courier: courierName,
      quote: quoteResult,
      bookedAt: new Date().toISOString(),
    },
    shipmenttracking: [],
  });

  return order.reload({ include: [{ model: OrderItem, as: 'items' }] });
}

/* ---------- Phase 2 freight ---------- */

async function createFreightConsignment(payload, actorUserId) {
  const userId = payload.user_id || actorUserId;
  if (!userId) throw new Error('user_id is required');

  const packages = Array.isArray(payload.packages) ? payload.packages : [];
  if (packages.length === 0) throw new Error('At least one package is required');

  const summary = summarizePackages(packages);
  const referenceId = await resolveUniqueReferenceId(payload.referenceId);
  const payment = normalizePaymentMode(payload.paymentMode || payload.paymentGateway);

  const consignment = await FreightConsignment.create({
    user_id: userId,
    referenceId,
    freightMode: payload.freightMode || 'LTL',
    status: 'Pending',
    warehouseId: payload.warehouseId || payload.warehouse || null,
    originPincode: payload.originPincode || null,
    destPincode: payload.destPincode || payload.pincode || null,
    consigneeName: payload.consigneeName || payload.customerName || null,
    consigneePhone: payload.consigneePhone || payload.customerPhone || null,
    consigneeGstin: payload.consigneeGstin || null,
    consigneeAddress: payload.consigneeAddress || payload.shippingAddress || null,
    packages: summary.boxes,
    chargeableWeight: summary.chargeableWeight,
    invoiceValue: Number(payload.invoiceValue) || 0,
    paymentMode: payment,
    billingParty: payload.billingParty || (payment === 'To-Pay' ? 'consignee' : 'shipper'),
    ewayBill: payload.ewayBill || null,
    pickupType: payload.pickupType || 'on_demand',
    pickupScheduledAt: payload.pickupScheduledAt || null,
    pickupStatus: 'pending',
    appointmentAt: payload.appointmentAt || null,
    zone: payload.zone || null,
    notes: payload.notes || null,
    manualBooking: true,
  });

  // Mirror as order for tracking/finance compatibility
  const order = await createB2bOrder(
    {
      user_id: userId,
      orderType: 'B2B_FREIGHT',
      freightMode: consignment.freightMode,
      packages: summary.boxes,
      customerName: consignment.consigneeName,
      customerPhone: consignment.consigneePhone,
      pincode: consignment.destPincode,
      deliveryPincode: consignment.destPincode,
      addressLine1: consignment.consigneeAddress?.addressLine1,
      city: consignment.consigneeAddress?.city,
      state: consignment.consigneeAddress?.state,
      shippingAddress: consignment.consigneeAddress,
      paymentGateway: payment,
      billingParty: consignment.billingParty,
      invoiceValue: consignment.invoiceValue,
      warehouse: consignment.warehouseId,
      consigneeGstin: consignment.consigneeGstin,
      ewayBill: consignment.ewayBill,
      appointmentAt: consignment.appointmentAt,
      zone: consignment.zone,
      referenceId,
    },
    userId
  );

  await consignment.update({ orderId: order.id });
  return { consignment, order };
}

async function listFreightConsignments({ user_id, freightMode, status } = {}, isAdmin = false) {
  const where = {};
  if (!isAdmin && user_id) where.user_id = user_id;
  if (isAdmin && user_id) where.user_id = user_id;
  if (freightMode) where.freightMode = freightMode;
  if (status) where.status = status;
  return FreightConsignment.findAll({ where, order: [['createdAt', 'DESC']] });
}

async function bookFreightConsignment(id, body, actorUserId) {
  const consignment = await FreightConsignment.findByPk(id);
  if (!consignment) throw new Error('Freight consignment not found');

  const lrNumber = String(body.lrNumber || body.awb || '').trim();
  if (!lrNumber) throw new Error('LR / AWB number is required');
  const courierName = String(body.courierName || body.courier || '').trim();
  if (!courierName) throw new Error('Courier name is required');

  let quoteResult = body.quote || null;
  if (!quoteResult && body.rateCardId) {
    const card = await B2bRateCard.findByPk(body.rateCardId);
    if (!card) throw new Error('Rate card not found');
    quoteResult = quoteFromCard(card, {
      zone: body.zone || consignment.zone || 'ZONE D',
      chargeableWeight: Number(consignment.chargeableWeight) || 0,
      paymentMode: normalizePaymentMode(consignment.paymentMode),
      invoiceValue: Number(consignment.invoiceValue) || 0,
    });
  }
  if (!quoteResult) throw new Error('Quote / rateCardId is required');

  const payment = normalizePaymentMode(consignment.paymentMode);
  const debitAmount = payment === 'To-Pay' ? 0 : Number(quoteResult.total) || 0;
  const user = await User.findByPk(consignment.user_id || actorUserId);
  if (!user) throw new Error('Seller not found');

  if (debitAmount > 0) {
    const balance = Number(user.walletBalance) || 0;
    if (balance < debitAmount) {
      throw new Error(`Insufficient wallet balance. Required ₹${debitAmount}, available ₹${balance}`);
    }
    await user.update({ walletBalance: round2(balance - debitAmount) });
    await Wallet.create({
      user_id: user.id,
      transid: lrNumber,
      referenceId: consignment.referenceId,
      amount: -debitAmount,
      status: 'success',
      description: `B2B freight booked (${courierName} ${consignment.freightMode}). LR: ${lrNumber}`,
    });
  }

  await consignment.update({
    lrNumber,
    courierName,
    status: 'READY FOR DISPATCH',
    quotedCharge: quoteResult.total,
    rateCardId: quoteResult.rateCardId || body.rateCardId,
    zone: quoteResult.zone || consignment.zone,
    pickupStatus: consignment.pickupScheduledAt ? 'scheduled' : 'requested',
  });

  if (consignment.orderId) {
    const order = await Order.findByPk(consignment.orderId);
    if (order) {
      await order.update({
        awb: lrNumber,
        courier: courierName,
        status: 'READY FOR DISPATCH',
        chargecor: String(quoteResult.total),
        b2bCharge: quoteResult.freight,
        b2bRateCardId: quoteResult.rateCardId || body.rateCardId,
        manualBooking: true,
        zone: quoteResult.zone || order.zone,
        totalShippingPrice: quoteResult.total,
      });
      await Shipment.create({
        orderNumber: order.orderNumber,
        referenceId: order.referenceId,
        shipmentjson: {
          manual: true,
          b2b: true,
          freight: true,
          awb: lrNumber,
          courier: courierName,
          quote: quoteResult,
          bookedAt: new Date().toISOString(),
        },
        shipmenttracking: [],
      });
    }
  }

  return consignment.reload();
}

async function updateFreightPickup(id, body) {
  const consignment = await FreightConsignment.findByPk(id);
  if (!consignment) throw new Error('Freight consignment not found');
  await consignment.update({
    pickupType: body.pickupType ?? consignment.pickupType,
    pickupScheduledAt: body.pickupScheduledAt !== undefined ? body.pickupScheduledAt : consignment.pickupScheduledAt,
    pickupStatus: body.pickupStatus ?? consignment.pickupStatus,
  });
  return consignment;
}

async function uploadFreightEpod(id, body) {
  const consignment = await FreightConsignment.findByPk(id);
  if (!consignment) throw new Error('Freight consignment not found');
  await consignment.update({
    epodUrl: body.epodUrl,
    appointmentAt: body.appointmentAt !== undefined ? body.appointmentAt : consignment.appointmentAt,
    status: body.markDelivered ? 'Delivered' : consignment.status,
  });
  if (consignment.orderId) {
    await Order.update(
      {
        epodUrl: body.epodUrl,
        appointmentAt: body.appointmentAt !== undefined ? body.appointmentAt : undefined,
        status: body.markDelivered ? 'Delivered' : undefined,
      },
      { where: { id: consignment.orderId } }
    );
  }
  return consignment.reload();
}

module.exports = {
  ZONES,
  summarizePackages,
  normalizePaymentMode,
  quoteFromCard,
  listRateCards,
  createRateCard,
  updateRateCard,
  deleteRateCard,
  quote,
  createB2bOrder,
  bookB2bOrder,
  createFreightConsignment,
  listFreightConsignments,
  bookFreightConsignment,
  updateFreightPickup,
  uploadFreightEpod,
};

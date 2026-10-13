const axios = require('axios');
require('dotenv').config();
const { resolvePackageMeta, resolveCountry, resolveAlternatePhone, isCodOrder, normalizeOrderForShipment, resolveCodAmount, resolveOrderAmount, resolveDiscount, resolveTax } = require('../utils/orderShipmentMeta');

const BASE_URL = (
  process.env.INNOFULFILL_BASE_URL ||
  process.env.SMC_BASE_URL ||
  'https://apis.delcaper.com'
).replace(/\/$/, '');

const CARRIER_NAME = process.env.INNOFULFILL_CARRIER_NAME || 'innofulfill_ecomm';
const CARRIER_ID = process.env.INNOFULFILL_CARRIER_ID || '';

let cachedAuth = null;
let tokenExpiresAt = 0;

function getUsername() {
  return process.env.INNOFULFILL_USERNAME || process.env.SMC_USER_NAME || '';
}

function getPassword() {
  return process.env.INNOFULFILL_PASSWORD || process.env.SMC_PASSWORD || '';
}

function getApiKey() {
  return process.env.INNOFULFILL_API_KEY || process.env.SMC_API_KEY || '';
}

function getTenantId(auth = cachedAuth) {
  return (
    process.env.INNOFULFILL_TENANT_ID ||
    process.env.SMC_TENANT_ID ||
    auth?.tenantId ||
    ''
  );
}

function getUserId(auth = cachedAuth) {
  return (
    process.env.INNOFULFILL_USER_ID ||
    process.env.SMC_USER_ID ||
    auth?.userId ||
    ''
  );
}

function ensureConfigured() {
  if (getApiKey()) return;
  if (!getUsername() || !getPassword()) {
    throw new Error(
      'InnoFulfill credentials not configured. Set INNOFULFILL_USERNAME/PASSWORD (or SMC_*) or INNOFULFILL_API_KEY in .env'
    );
  }
}

function cleanPhone(phone) {
  return String(phone || '')
    .replace(/^\+91/, '')
    .replace(/\D/g, '')
    .slice(-10);
}

function toNumber(val, fallback = 0) {
  if (val === null || val === undefined || val === '') return fallback;
  const num = Number(String(val).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(num) ? num : fallback;
}

function parseAmount(amount) {
  return toNumber(amount, 0);
}

function resolveOrderDiscount(order = {}) {
  const direct = toNumber(order.totalDiscounts ?? order.totalDiscounts, 0);
  const itemDiscount = (Array.isArray(order.items) ? order.items : []).reduce(
    (sum, item) => sum + toNumber(item.discount, 0),
    0
  );
  if (direct > 0 || itemDiscount > 0) return Number((direct + itemDiscount).toFixed(2));
  const codes = Array.isArray(order.discountCodes) ? order.discountCodes : [];
  const fromCodes = codes.reduce((sum, code) => sum + toNumber(code?.amount, 0), 0);
  return Number(Math.max(0, fromCodes).toFixed(2));
}

function moneyEntry(name, description, type, value, amount) {
  const charged = Number(Number(amount || 0).toFixed(2));
  return {
    name,
    description,
    type,
    value: Number(value || 0),
    chargedAmount: charged,
    chargedAmount: charged,
  };
}

function buildDiscountEntries(order = {}) {
  const total = resolveOrderDiscount(order);
  if (total <= 0) return [];
  const codes = Array.isArray(order.discountCodes) ? order.discountCodes : [];
  const label = codes.find((c) => c?.code || c?.title);
  const name = label?.code || label?.title || 'Discount';
  return [moneyEntry(name, name === 'Discount' ? 'Order discount' : `Discount (${name})`, 'FLAT', total, total)];
}

function buildTaxEntries(order = {}, items = []) {
  const totalTax = toNumber(order.totalTax ?? order.totalTax, 0);
  const entries = [];
  (Array.isArray(items) ? items : []).forEach((item) => {
    const rate = toNumber(item.gstRate ?? item.gstRate, 0);
    const qty = toNumber(item.quantity, 1) || 1;
    const price = toNumber(item.unitPrice ?? item.unitPrice, 0);
    const taxable = Math.max(0, price * qty);
    const charged = Number(((taxable * rate) / 100).toFixed(2));
    if (rate > 0 && charged > 0) {
      entries.push(moneyEntry('GST', `GST @${rate}%`, 'PERCENTAGE', rate, charged));
    }
  });
  if (entries.length > 0) return entries;
  if (totalTax <= 0) return [];
  let gstRate = 0;
  const subtotal = toNumber(order.subtotalPrice ?? order.subtotalPrice, 0);
  if (subtotal > 0) gstRate = Number(((totalTax / subtotal) * 100).toFixed(2));
  if (gstRate > 0) return [moneyEntry('GST', `GST @${gstRate}%`, 'PERCENTAGE', gstRate, totalTax)];
  return [moneyEntry('GST', 'GST', 'FLAT', totalTax, totalTax)];
}

function isCod(order) {
  return isCodOrder(order);
}

function deliveryModeFromRate(data22, order, tmpindex) {
  try {
    if (String(order.shippingMode || order.freightMode || '').toLowerCase().includes('air')) {
      return 'AIR';
    }
    const type =
      data22?.ratelist?.[order.referenceId]?.type?.[data22?.coureir?.[tmpindex]] || '';
    return String(type).toLowerCase().includes('air') ? 'AIR' : 'SURFACE';
  } catch {
    return 'SURFACE';
  }
}

function buildAddressName(parts) {
  return parts.filter(Boolean).join(', ');
}

/**
 * Login (V2) — returns id_token + tenant/user context.
 * Prefer API key auth when INNOFULFILL_API_KEY is set.
 */
async function getAuth(force = false) {
  ensureConfigured();

  if (getApiKey()) {
    return {
      mode: 'apiKey',
      apiKey: getApiKey(),
      tenantId: getTenantId(),
      userId: getUserId(),
      idToken: null
    };
  }

  if (!force && cachedAuth?.idToken && Date.now() < tokenExpiresAt) {
    return cachedAuth;
  }

  const response = await axios.post(
    `${BASE_URL}/auth/login`,
    {
      username: getUsername(),
      password: getPassword(),
      signinType: 'EMAIL'
    },
    { headers: { 'Content-Type': 'application/json' }, timeout: 30000 }
  );

  const body = response.data?.data || response.data || {};
  const idToken =
    body.id_token ||
    body.idToken ||
    body.accessToken ||
    body.access_token ||
    response.data?.id_token;

  if (!idToken) {
    throw new Error(response.data?.message || 'Failed to get InnoFulfill id_token');
  }

  const expiresIn = Number(body.expires_in || body.expiresIn || 3600);
  const refreshToken = body.refresh_token || body.refreshToken || null;
  const userId = body.userId || body.user_id || body.user?.id || '';
  const tenantId =
    body.tenantId ||
    body.tenant_id ||
    body.tenant?.id ||
    body.tenantContext?.tenantId ||
    '';

  cachedAuth = {
    mode: 'bearer',
    idToken,
    refreshToken,
    userId,
    tenantId,
    raw: body
  };
  tokenExpiresAt = Date.now() + Math.max(60, expiresIn - 60) * 1000;
  return cachedAuth;
}

/** @deprecated Use getAuth — kept for callers expecting a token string */
async function getToken(force = false) {
  const auth = await getAuth(force);
  return auth.idToken || auth.apiKey || '';
}

function authHeaders(auth) {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  };

  if (auth.mode === 'apiKey' && auth.apiKey) {
    headers['api-key'] = auth.apiKey;
    headers['Api-Key'] = auth.apiKey;
    return headers;
  }

  headers.Authorization = `Bearer ${auth.idToken}`;
  const tenantId = getTenantId(auth);
  if (tenantId) {
    headers.tenantid = tenantId;
    headers.TenantId = tenantId;
    headers.tenantId = tenantId;
  }
  return headers;
}

async function withAuth(requestFn) {
  let auth = await getAuth();
  try {
    return await requestFn(auth);
  } catch (error) {
    if (error.response?.status === 401 && auth.mode === 'bearer') {
      auth = await getAuth(true);
      return await requestFn(auth);
    }
    throw error;
  }
}

/**
 * Map address to InnoFulfill docs format.
 * Docs put the full human-readable address in `addressName`.
 */
function mapAddress(type, person) {
  const zip = String(person.zip || person.pincode || '').replace(/\D/g, '').slice(0, 6);
  const street = String(person.street || person.address1 || person.address || '').trim();
  const landmark = String(person.landmark || person.address2 || '').trim();
  const city = person.city || '';
  const state = person.state || '';
  const country = person.country || 'India';

  const addressName =
    person.addressName ||
    buildAddressName([street, landmark, city, state, zip]) ||
    street ||
    city;

  const mapped = {
    type,
    zip,
    name: person.name || '',
    phone: cleanPhone(person.phone),
    email: person.email || '',
    street: street || '',
    landmark: landmark || '',
    city,
    state,
    country,
    latitude: person.latitude ?? null,
    longitude: person.longitude ?? null,
    addressName,
  };

  // Docs sample: GSTNumber only on PICKUP
  if (type === 'PICKUP') {
    mapped.GSTNumber = person.gst || person.GSTNumber || '';
  }

  return mapped;
}

/**
 * Build V2 ECOMM booking payload per InnoFulfill docs:
 * https://docs.innofulfill.com/api-docs?api=post-booking-ecomm
 */
function buildEcommOrderPayload(order, warehouse, data22, tmpindex) {
  order = normalizeOrderForShipment(order);
  const items = Array.isArray(order.items) ? order.items : [];
    const amount = parseAmount(order.amount) || resolveOrderAmount(order);
  const discountAmount = resolveOrderDiscount(order);
  const cod = isCod(order);
  const mode = deliveryModeFromRate(data22, order, tmpindex);

  let weightKg = items.reduce(
    (sum, item) => sum + toNumber(item.deadWeight, 0) ,
    0
  );
  const pkg = resolvePackageMeta(order);
  if (!weightKg) weightKg = pkg.deadWeight || 0.5;

  const firstItem = items[0] || {};
  const length = pkg.length;
  const width = pkg.width;
  const height = pkg.height;
  const volumetricWeight = pkg.volumetricWeight;

  const customer = {
    name: order.customerName || '',
    phone: order.customerPhone || '',
    alternatePhone: resolveAlternatePhone(order) || '',
    email: order.customerEmail || '',
    address1: order.addressLine1 || '',
    address2: order.addressLine2 || '',
    landmark: order.landmark || '',
    city: order.city || '',
    state: order.state || '',
    pincode: order.pincode || '',
    country: resolveCountry(order),
    addressType: order.addressType || 'Home',
  };

  const pickup = {
    name: warehouse?.name || '',
    phone: warehouse?.phone || '',
    email: warehouse?.email || '',
    address1: warehouse?.address || '',
    address2: '',
    landmark: '',
    city: warehouse?.city || '',
    state: warehouse?.state || '',
    pincode: warehouse?.pincode || '',
    country: 'India',
    gst: warehouse?.gst || '',
  };

  const orderDateRaw =
    data22?.dispatchdate?.[order.referenceId] ||
    order.processedAt ||
    order.orderDate ||
    order.createdAt ||
    new Date();
  const orderDateObj = new Date(orderDateRaw);
  const orderDateIso = Number.isNaN(orderDateObj.getTime())
    ? new Date().toISOString()
    : orderDateObj.toISOString();

  const safeItems =
    items.length > 0
      ? items
      : [
          {
            name: 'Product',
            quantity: 1,
            unitPrice: amount || 1,
            sku: `SKU-${order.referenceId || '1'}`,
            description: 'Product',
          },
        ];

  const taxes = buildTaxEntries(order, safeItems);
  const discounts = discountAmount > 0 ? buildDiscountEntries(order) : [];

// taxes={
//       name: 'GST',
//       description: `GST @%`,
//       type: 'PERCENTAGE',
//       value: x.gstRate,
//       chargedAmount: taxes,
//     }




  const payment = cod
    ? {
        type: 'COD',
        currency: order.currency || 'INR',
        paymentMethod: 'COD',
        collectableAmount: resolveCodAmount(order),
      }
    : {
        type: 'PREPAID',
        currency: order.currency || 'INR',
        paymentMethod: 'ONLINE',
      };
	 
	const declaredAmount = Number(
    (cod ? resolveCodAmount(order) || amount : amount) || 0
  );
  const payload = {
    referenceId: String(order.referenceId || order.id),
   // amount: cod ? resolveCodAmount(order) :   order.currency,
     amount: declaredAmount, 
    orderDate: orderDateIso,
    orderType: 'FORWARD',
    orderStatus: 'CONFIRMED',
    parcelCategory: 'ECOMM',
    autoManifest: true,
    eWaybills: Array.isArray(order.eWaybills)
      ? order.eWaybills.filter(Boolean).map(String)
      : order.ewayBill
        ? [String(order.ewayBill)]
        : [],
    deliveryPromise: 'ECOMM',
    deliveryMode: mode === 'AIR' ? 'AIR' : 'SURFACE',
    documentType: '',
    taxes,
    discounts,
    metadata: {
      source: 'innofulfill_v2',
    },
    documents: [],
    addresses: [
      mapAddress('PICKUP', pickup),
      mapAddress('DELIVERY', customer),
      mapAddress('BILLING', customer),
      mapAddress('RETURN', pickup),
    ],
    shipments: [
      {
        dimensions: {
          length: Number(length),
          width: Number(width),
          height: Number(height),
        },
        shipmentStatus: 'CONFIRMED',
        awbNumber: '',
        physicalWeight: Number(Math.max(0.1, weightKg).toFixed(3)),
        physicalWeightUnit: 'KG',
        volumetricWeight,
        note: discountAmount > 0 ? `Discount: INR ${discountAmount}` : '',
        items: safeItems.map((item, index) => ({
          name: item.name || `Item ${index + 1}`,
          quantity: Math.max(1, toNumber(item.quantity, 1)),
          unitPrice: Math.max(0, toNumber(item.unitPrice, 0)),
          sku: String(item.sku || item.productId || item.id || `SKU-${index + 1}`).slice(0, 64),
          hsnCode: item.hsnCode || item.hsn || '',
          gstRate: item.gstRate || 0,
          description: item.description || item.name || 'Product',
        })),
      },
    ],
    carrierName: CARRIER_NAME,
    payment,
  };

  if (CARRIER_ID) {
    payload.carrierId = CARRIER_ID;
  }

  return payload;
}

function extractAwb(data) {
  return (
    data?.shipments?.[0]?.awbNumber ||
    data?.shipment?.awbNumber ||
    data?.awbNumber ||
    data?.awb ||
    data?.data?.awbNumber ||
    data?.data?.shipments?.[0]?.awbNumber ||
    null
  );
}

function extractOrderId(data) {
  return (
    data?.orderId ||
    data?.id ||
    data?.data?.orderId ||
    data?.data?.id ||
    null
  );
}

/**
 * Create ECOMM order via V2 booking API.
 * Returns legacy-compatible shape: { status: 200, data: { awbNumber, orderId }, ... }
 */
async function createShipment(order, warehouse, data22, tmpindex) {
  try {
    let payload = buildEcommOrderPayload(order, warehouse, data22, tmpindex);


    console.log('InnoFulfill create payload:', JSON.stringify(payload, null, 2));


    const fs = require("fs/promises");

  

  await fs.writeFile(
    "./innofulfillService.jspayload.json",
    JSON.stringify(payload, null, 2),
    "utf8"
  );








    let response;
    try {
      response = await withAuth(async (auth) => {
        return axios.post(`${BASE_URL}/gateway/booking-service/orders`, payload, {
          headers: authHeaders(auth),
          timeout: 60000
        });
      });
    } catch (firstErr) {
      // Retry once without discounts if provider rejects discount schema
      const detail = firstErr.response?.data || firstErr.message;
      console.warn('InnoFulfill create failed, retrying without discounts:', detail);
      payload = {
        ...payload,
        discounts: [],
        metadata: {
          ...(payload.metadata || {}),
          discountRetry: true,
        },
      };
      response = await withAuth(async (auth) => {
        return axios.post(`${BASE_URL}/gateway/booking-service/orders`, payload, {
          headers: authHeaders(auth),
          timeout: 60000
        });
      });
    }

    const body = response.data?.data || response.data || {};
    let awbNumber = extractAwb(body) || extractAwb(response.data);
    let orderId = extractOrderId(body) || extractOrderId(response.data);

    // If booking succeeded without AWB yet, fetch order details once
    if (orderId && !awbNumber) {
      try {
        const detailRes = await withAuth(async (auth) => {
          return axios.get(
            `${BASE_URL}/gateway/booking-service/orders/${encodeURIComponent(orderId)}`,
            { headers: authHeaders(auth), timeout: 30000 }
          );
        });
        const detail = detailRes.data?.data || detailRes.data || {};
        awbNumber = extractAwb(detail) || awbNumber;
        orderId = extractOrderId(detail) || orderId;
      } catch (detailErr) {
        console.warn('InnoFulfill order detail fetch failed:', detailErr.message);
      }
    }

    const ok =
      response.status >= 200 &&
      response.status < 300 &&
      (awbNumber || orderId || response.data?.success !== false);

    if (!ok || (!awbNumber && !orderId)) {
      return {
        status: response.status || 400,
        success: false,
        message:
          response.data?.message ||
          body?.message ||
          'InnoFulfill did not return AWB/orderId',
        data: { awbNumber: awbNumber || null, orderId: orderId || null },
        raw: response.data,
        payload
      };
    }

    return {
      status: 200,
      success: true,
      message: response.data?.message || 'Order received successfully',
      data: {
        awbNumber: awbNumber ? String(awbNumber) : null,
        orderId: orderId ? String(orderId) : null
      },
      raw: response.data,
      payload
    };
  } catch (error) {
    console.error('InnoFulfill create shipment error:', error.response?.data || error.message);
    const errData = error.response?.data;
    const message =
      errData?.message ||
      errData?.error ||
      (Array.isArray(errData?.errors) ? errData.errors.map((e) => e.message || e).join(', ') : null) ||
      (typeof errData === 'string' ? errData : null) ||
      error.message ||
      'Failed to create InnoFulfill shipment';
    return {
      status: error.response?.status || 500,
      success: false,
      message,
      data: errData
    };
  }
}

/**
 * Calculate ECOMM rates (V2).
 * Returns legacy-compatible { shippingCharge, fuelCharges, ... }
 */
async function calculateEcommRate(tmpdata) {
  try {
    const isCod = String(tmpdata.paymentMode || '').toUpperCase() === 'COD';
    const payload = {
      fromPincode: toNumber(tmpdata.originPincode),
      toPincode: toNumber(tmpdata.deliveryPincode),
      serviceType: 'ECOMM',
      productType: 'ECOMM',
      weight: toNumber(tmpdata.weight, 0.5),
      length: toNumber(tmpdata.dimensions?.length, 10),
      height: toNumber(tmpdata.dimensions?.height, 10),
      width: toNumber(tmpdata.dimensions?.width, 10),
      includeDefaultCharges: false,
      userOptions: {
        insurance: { enabled: false, amount: 0 },
        cod: isCod
      },
      filters: {
        delivery_mode: String(tmpdata.shipmentType || tmpdata.deliveryMode || 'SURFACE')
          .toUpperCase()
          .includes('AIR')
          ? 'AIR'
          : 'SURFACE'
      }
    };

    const response = await withAuth(async (auth) => {
      return axios.post(
        `${BASE_URL}/gateway/ure/api/external/rate-calculation/calculate/v2`,
        payload,
        { headers: authHeaders(auth), timeout: 30000 }
      );
    });

    const data = response.data?.data || response.data || {};
    const rates = Array.isArray(data.rates) ? data.rates[0] : data;
    const shippingCharge = toNumber(
      rates?.baseRate ??
        rates?.shippingCharge ??
        rates?.totalCharge ??
        rates?.totalRate ??
        rates?.rate ??
        data?.baseRate ??
        data?.shippingCharge ??
        data?.totalCharge ??
        0
    );
    const fuelCharges = toNumber(
      rates?.fuelCharges ?? rates?.fuelSurcharge ?? data?.fuelCharges ?? 0
    );
    const gst = toNumber(rates?.gst ?? rates?.tax ?? data?.gst ?? 0);

    return {
      shippingCharge,
      fuelCharges: fuelCharges || gst,
      gst,
      raw: response.data
    };
  } catch (error) {
    console.error('InnoFulfill rate error:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Track by AWB (V2). Normalizes to legacy { orderStatus, orderStateInfo, expectedDeliveryDate }.
 */
async function trackByAwb(awb) {
  try {
    if (!awb) {
      return { success: false, error: 'AWB is required' };
    }

    const response = await withAuth(async (auth) => {
      return axios.get(
        `${BASE_URL}/gateway/tracking-v2/api/tracking/awb/${encodeURIComponent(awb)}`,
        { headers: authHeaders(auth), timeout: 30000 }
      );
    });

    const raw = response.data?.data || response.data || {};
    const statuses = raw.statuses || raw.trackingHistory || raw.orderStateInfo || [];
    const orderStatus =
      raw.orderStatus ||
      raw.currentStatus ||
      raw.status ||
      (Array.isArray(statuses) && statuses.length
        ? statuses[statuses.length - 1]?.status || statuses[statuses.length - 1]?.state
        : null);

    const orderStateInfo = (Array.isArray(statuses) ? statuses : []).map((event) => ({
      state: event.state || event.status || event.eventCode || '',
      status: event.status || event.state || event.eventCode || '',
      location: event.location || event.city || event.hub || 'Unknown',
      timestamp: event.timestamp || event.eventTime || event.date || event.createdAt,
      description: event.description || event.remarks || event.remark || '',
      createdAt: event.timestamp || event.eventTime || event.createdAt
    }));

    return {
      success: true,
      data: {
        data: {
          orderStatus,
          expectedDeliveryDate: raw.expectedDeliveryDate || raw.edd || 'Pending',
          orderStateInfo,
          statuses: orderStateInfo,
          awbNumber: awb,
          raw
        }
      }
    };
  } catch (error) {
    console.error(`InnoFulfill tracking error for ${awb}:`, error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

/**
 * Cancel order(s) via V2 bulk cancel — requires InnoFulfill orderId (not AWB).
 */
async function cancelOrders(orders) {
  try {
    const list = (Array.isArray(orders) ? orders : [orders])
      .map((o) =>
        typeof o === 'string'
          ? { orderId: o, reason: 'Customer requested cancellation' }
          : {
              orderId: o.orderId,
              reason: o.reason || 'Customer requested cancellation'
            }
      )
      .filter((o) => o.orderId);

    if (!list.length) {
      return { success: false, message: 'InnoFulfill orderId is required for cancel' };
    }

    const response = await withAuth(async (auth) => {
      return axios.post(
        `${BASE_URL}/gateway/booking-service/orders/cancel/bulk`,
        { orders: list },
        { headers: authHeaders(auth), timeout: 30000 }
      );
    });

    const ok = response.status >= 200 && response.status < 300;
    return {
      success: ok,
      status: ok ? 200 : response.status,
      message: response.data?.message || (ok ? 'Cancelled successfully' : 'Cancel failed'),
      data: response.data
    };
  } catch (error) {
    console.error('InnoFulfill cancel error:', error.response?.data || error.message);
    return {
      success: false,
      message:
        error.response?.data?.message ||
        error.message ||
        'Failed to cancel InnoFulfill shipment',
      data: error.response?.data
    };
  }
}

/**
 * Download shipping label (V2) — needs orderId (+ tenantId/userId).
 */
async function getShippingLabel({ orderId, tenantId, userId }) {
  try {
    if (!orderId) {
      return { success: false, message: 'orderId is required' };
    }

    const auth = await getAuth();
    const payload = {
      orderId: String(orderId),
      tenantId: String(tenantId || getTenantId(auth) || ''),
      userId: String(userId || getUserId(auth) || '')
    };

    const response = await withAuth(async (a) => {
      return axios.post(`${BASE_URL}/gateway/pdf-generator/shipping-label`, payload, {
        headers: authHeaders(a),
        timeout: 60000,
        responseType: 'arraybuffer',
        validateStatus: () => true
      });
    });

    const contentType = String(response.headers?.['content-type'] || '');
    if (contentType.includes('application/json')) {
      const text = Buffer.from(response.data).toString('utf8');
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        json = { message: text };
      }
      const url =
        json?.data?.url ||
        json?.data?.shippingLabelUrl ||
        json?.shippingLabelUrl ||
        json?.url;
      if (url) {
        return { success: true, shippingLabelUrl: url, data: json };
      }
      return {
        success: false,
        message: json?.message || 'Label not found',
        data: json
      };
    }

    if (response.status >= 200 && response.status < 300 && response.data) {
      return {
        success: true,
        buffer: Buffer.from(response.data),
        contentType: contentType || 'application/pdf'
      };
    }

    return {
      success: false,
      message: 'Failed to download shipping label',
      status: response.status
    };
  } catch (error) {
    console.error('InnoFulfill label error:', error.response?.data || error.message);
    return {
      success: false,
      message: error.message || 'Failed to get shipping label',
      data: error.response?.data
    };
  }
}

/** Resolve InnoFulfill orderId stored on shipment/order for cancel/label. */
function resolveExternalOrderId(order, shipment) {
  const tracking = shipment?.shipmenttracking;
  return (
    tracking?.data?.orderId ||
    tracking?.orderId ||
    tracking?.raw?.orderId ||
    tracking?.raw?.data?.orderId ||
    order?.trackingnumber ||
    null
  );
}

module.exports = {
  getAuth,
  getToken,
  getinnofulfilltoken: getToken,
  createShipment,
  calculateEcommRate,
  trackByAwb,
  cancelOrders,
  getShippingLabel,
  buildEcommOrderPayload,
  resolveExternalOrderId,
  BASE_URL
};

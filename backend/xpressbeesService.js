const axios = require('axios');
require('dotenv').config();
const { normalizeOrderForShipment, resolvePackageMeta, isCodOrder, resolveCodAmount, resolveOrderAmount, resolveDiscount, resolveShippingCharges, resolveAlternatePhone, resolveCountry } = require('../utils/orderShipmentMeta');

const BASE_URL = (process.env.XPRESSBEES_BASE_URL || 'https://shipment.xpressbees.com/api').replace(/\/$/, '');

let cachedToken = null;
let tokenExpiresAt = 0;

function ensureConfigured() {
  if (!process.env.XPRESSBEES_EMAIL || !process.env.XPRESSBEES_PASSWORD) {
    throw new Error('Xpressbees credentials not configured. Set XPRESSBEES_EMAIL and XPRESSBEES_PASSWORD in .env');
  }
}

/**
 * Login and cache bearer token (refreshes every ~50 minutes).
 */
async function getToken(force = false) {
  ensureConfigured();

  if (!force && cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const response = await axios.post(
    `${BASE_URL}/users/login`,
    {
      email: process.env.XPRESSBEES_EMAIL,
      password: process.env.XPRESSBEES_PASSWORD
    },
    { headers: { 'Content-Type': 'application/json' }, timeout: 30000 }
  );

  const token =
    response.data?.data ||
    response.data?.token ||
    response.data?.data?.access_token ||
    response.data?.access_token;

  if (!token) {
    throw new Error(response.data?.message || 'Failed to get Xpressbees token');
  }

  cachedToken = token;
  tokenExpiresAt = Date.now() + 50 * 60 * 1000;
  return token;
}

async function withAuth(requestFn) {
  let token = await getToken();
  try {
    return await requestFn(token);
  } catch (error) {
    if (error.response?.status === 401) {
      token = await getToken(true);
      return await requestFn(token);
    }
    throw error;
  }
}

/**
 * Build Xpressbees shipment payload from internal order + warehouse.
 */
function buildShipmentPayload(order, warehouse) {
  order = normalizeOrderForShipment(order);
  const items = order.items || [];
  const amount = resolveOrderAmount(order);
  const discount = resolveDiscount(order);
  const shipping = resolveShippingCharges(order);
  const isCod = isCodOrder(order);
  const pkg = resolvePackageMeta(order);

  return {
    order_number: String(order.referenceId || order.orderNumber),
    shipping_charges: shipping,
    discount,
    cod_charges: 0,
    payment_type: isCod ? 'cod' : 'prepaid',
    order_amount: amount,
    package_weight: Math.max(pkg.deadWeight, 0.5) * 1000,
    package_length: pkg.length,
    package_breadth: pkg.width,
    package_height: pkg.height,
    request_auto_pickup: 'yes',
    consignee: {
      name: order.customerName || '',
      address: `${order.addressLine1 || ''} ${order.addressLine2 || ''}`.trim() || order.city || '',
      address_2: order.landmark || order.addressLine2 || '',
      city: order.city || '',
      state: order.state || '',
      pincode: String(order.pincode || ''),
      phone: String(order.customerPhone || ''),
      alternate_phone: resolveAlternatePhone(order) || undefined,
      email: order.customerEmail || undefined,
      country: resolveCountry(order)
    },
    pickup: {
      warehouse_name: warehouse?.name || process.env.XPRESSBEES_WAREHOUSE_NAME || 'Default',
      name: warehouse?.name || '',
      address: warehouse?.address || '',
      address_2: '',
      city: warehouse?.city || '',
      state: warehouse?.state || '',
      pincode: String(warehouse?.pincode || ''),
      phone: String(warehouse?.phone || '')
    },
    order_items: items.map((item, index) => ({
      name: item.name || `Item ${index + 1}`,
      qty: Number(item.quantity || 1),
      price: Number(item.unitPrice || 0),
      sku: item.sku || item.productId || `SKU-${index + 1}`,
      hsn_code: item.hsnCode || item.hsn || undefined
    })),
    collectable_amount: isCod ? resolveCodAmount(order) : 0,
    ...(process.env.XPRESSBEES_COURIER_ID ? { courier_id: process.env.XPRESSBEES_COURIER_ID } : {})
  };
}

/**
 * Create shipment on Xpressbees.
 * @returns {{ success: boolean, awb?: string, data?: any, message?: string, payload?: any }}
 */
async function createShipment(order, warehouse) {
  try {
    const payload = buildShipmentPayload(order, warehouse);




    const response = await withAuth(async (token) => {
      return axios.post(`${BASE_URL}/shipments2`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      });
    });

    const data = response.data?.data || response.data;
    const awb =
      data?.awb_number ||
      data?.awb ||
      data?.AWB ||
      data?.shipping_id ||
      response.data?.awb_number;

    if (!awb) {
      return {
        success: false,
        message: response.data?.message || data?.message || 'Xpressbees did not return AWB',
        data: response.data,
        payload
      };
    }

    return {
      success: true,
      awb: String(awb),
      data: response.data,
      payload
    };
  } catch (error) {
    console.error('Xpressbees create shipment error:', error.response?.data || error.message);
    return {
      success: false,
      message:
        error.response?.data?.message ||
        error.response?.data?.error ||
        (typeof error.response?.data === 'string' ? error.response.data : null) ||
        error.message ||
        'Failed to create Xpressbees shipment',
      data: error.response?.data
    };
  }
}

/**
 * Cancel shipment by AWB.
 */
async function cancelShipment(awb) {
  try {
    if (!awb) {
      return { success: false, message: 'AWB is required' };
    }

    const response = await withAuth(async (token) => {
      return axios.post(
        `${BASE_URL}/shipments2/cancel`,
        {  awb: String(awb) },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );
    });

    const ok =
      response.status === 200 &&
      (response.data?.status === true ||
        response.data?.success === true ||
        response.data?.data ||
        !response.data?.error);

    return {
      success: ok,
      message: response.data?.message || (ok ? 'Cancelled successfully' : 'Cancel failed'),
      data: response.data
    };
  } catch (error) {
    console.error('Xpressbees cancel error:', error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || error.message || 'Failed to cancel Xpressbees shipment',
      data: error.response?.data
    };
  }
}

/**
 * Track shipment by AWB.
 */
async function trackShipment(awb) {
  try {
    if (!awb) {
      return { success: false, error: 'AWB is required' };
    }

    const response = await withAuth(async (token) => {
      try {
        return await axios.get(`${BASE_URL}/shipments2/track/${encodeURIComponent(awb)}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        });
      } catch (getErr) {
        // Fallback POST track endpoint used by some XB accounts
        return axios.post(
          `${BASE_URL}/shipments2/track`,
          { awb_number: String(awb) },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            timeout: 30000
          }
        );
      }
    });

    return {
      success: true,
      data: response.data?.data || response.data
    };
  } catch (error) {
    console.error('Xpressbees track error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

module.exports = {
  getToken,
  createShipment,
  cancelShipment,
  trackShipment,
  buildShipmentPayload
};

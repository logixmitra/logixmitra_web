const Integration = require('../models/Integration');

const SHOPIFY_API_VERSION = '2026-01';

function fetchWithTimeout(url, options = {}, ms = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  );
}

function normalizeShopDomain(storeUrl) {
  return String(storeUrl || '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '')
    .replace(/\.myshopify\.com.*/i, '')
    .split('/')[0]
    .replace(/\s+/g, '');
}

function numericShopifyOrderId(order) {
  const raw = order?.shopifyOrderId || order?.shopifyid || '';
  const text = String(raw).trim();
  if (!text || text === '-') return null;
  const gid = text.match(/Order\/(\d+)/i);
  if (gid) return gid[1];
  const digits = text.replace(/\D/g, '');
  return digits || null;
}

function isShopifyOrder(order) {
  return String(order?.platform || '').toLowerCase() === 'shopify';
}

function trackingInfo(order, awbOverride, courierOverride) {
  const awb = String(awbOverride || order?.awb || '').trim();
  const courier = String(courierOverride || order?.courier || '').toLowerCase();
  let company = 'Other';
  let url = awb ? `https://www.google.com/search?q=${encodeURIComponent(awb)}` : '';

  if (courier.includes('ekart')) {
    company = 'Ekart';
    url = `https://ekartlogistics.com/ekartlogistics-web/shipmenttrack/${awb}`;
  } else if (courier.includes('delhivery')) {
    company = 'Delhivery';
    url = `https://www.delhivery.com/track-v2/package/${awb}`;
  } else if (courier.includes('bluedart') || courier.includes('blue dart')) {
    company = 'BlueDart';
    url = `https://www.bluedart.com/tracking/${awb}`;
  } else if (
    courier.includes('smc') ||
    courier.includes('innufill') ||
    courier.includes('innofulfil') ||
    courier.includes('shree maruti')
  ) {
    company = 'Other';
    url = `https://shreemaruti.com/track-shipment/?awb=${awb}`;
  } else if (courier.includes('shadowfax')) {
    company = 'Shadowfax';
    url = `https://shadowfax.in/track/${awb}`;
  } else if (courier.includes('xpressbees') || courier.includes('xpress bees')) {
    company = 'Xpressbees';
    url = `https://www.xpressbees.com/track?awb=${awb}`;
  } else if (courier && courier !== '-' && courier !== 'unknown') {
    company = courierOverride || order?.courier || 'Other';
  }

  return { awb, company, url };
}

async function getShopifyAccessToken(credentials) {
  const shop = normalizeShopDomain(credentials?.storeUrl);
  const clientId = credentials?.clientid || credentials?.clientId;
  const clientSecret = credentials?.accessToken || credentials?.clientSecret;
  if (!shop || !clientId || !clientSecret) {
    throw new Error('Missing Shopify store URL, Client ID, or Client Secret');
  }

  const response = await fetchWithTimeout(
    `https://${shop}.myshopify.com/admin/oauth/access_token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    },
    15000
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) {
    const detail =
      payload.error_description || payload.error || response.statusText || response.status;
    throw new Error(`Shopify token request failed: ${detail}`);
  }
  return { shop, token: payload.access_token };
}

async function findShopifyIntegration(order) {
  const userId = Number(order?.user_id || order?.seller);
  if (!Number.isFinite(userId) || userId <= 0) return null;
  return Integration.findOne({
    where: {
      user_id: userId,
      type: 'Shopify',
    },
  });
}

async function shopifyJson(url, options, timeoutMs = 15000) {
  const response = await fetchWithTimeout(url, options, timeoutMs);
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

function openFulfillmentOrders(list) {
  return (Array.isArray(list) ? list : []).filter((fo) => {
    const status = String(fo?.status || '').toLowerCase();
    return status === 'open' || status === 'in_progress' || status === 'scheduled';
  });
}

function isRtoStatus(status) {
  const s = String(status || '').toLowerCase();
  return s.includes('rto') || s.includes('return to origin');
}

function isCancelledStatus(status) {
  const s = String(status || '').trim().toLowerCase();
  if (!s) return false;
  // Exact "Cancelled"/"Canceled" plus courier cancel variants such as
  // "PICKUP CANCELLED", "Seller cancelled the order", "order cancelled".
  // RTO ("return to origin") never contains "cancel", so it stays excluded.
  return s.includes('cancel');
}

function isUndeliveredStatus(status) {
  const s = String(status || '').toLowerCase();
  return s.includes('undeliver') || s.includes('ndr') || s.includes('reschedul');
}

function isPickedUpStatus(status) {
  const s = String(status || '').toLowerCase();
  return (
    s.includes('out for pickup') ||
    s.includes('pickup scheduled') ||
    s.includes('picked up') ||
    s.includes('pickup complete') ||
    s.includes('pickup_complete')
  );
}

function isInTransitStatus(status) {
  const s = String(status || '').toLowerCase();
  return (
    s.includes('in transit') ||
    s.includes('in_transit') ||
    s.includes('shipped') ||
    s.includes('manifested') ||
    s.includes('dispatched') ||
    s.includes('outscan') ||
    s.includes('inscanned')
  );
}

function isBookingStatus(status) {
  const s = String(status || '').toLowerCase();
  return (
    s.includes('ready for dispatch') ||
    s.includes('ready to ship') ||
    s.includes('courier assigned') ||
    s.includes('label') ||
    s === 'processing'
  );
}

function singleLine(value, max = 200) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

/**
 * Map a LogixMitra order status (Courier / AWB column) to the closest Shopify
 * fulfillment event. Shopify FulfillmentEventStatus enum values are:
 * confirmed | in_transit | out_for_delivery | delivered | attempted_delivery |
 * carrier_picked_up | ready_for_pickup | delayed | label_printed | label_purchased.
 * Returns null when Shopify has no equivalent (e.g. Pending).
 */
function mapStatusToFulfillmentEvent(status, ndrReason = '') {
  const s = String(status || '').trim();
  if (!s) return null;
  const lower = s.toLowerCase();
  const reason = singleLine(ndrReason);

  if (lower === 'pending' || lower === 'new') return null;

  // A cancelled pickup/shipment ("PICKUP CANCELLED", "Cancelled", ...) has no
  // Shopify fulfillment event — cancel handling lives in fulfillShopifyOrder.
  // Bail out here so no pickup/transit event is ever posted for it.
  if (isCancelledStatus(lower)) return null;

  // Check "out for delivery" before the generic "deliver" match.
  if (lower.includes('out for delivery')) {
    return { status: 'out_for_delivery' };
  }
  if (lower.includes('deliver') && !lower.includes('undeliver') && !isRtoStatus(lower)) {
    return { status: 'delivered' };
  }
  if (isUndeliveredStatus(lower)) {
    return {
      status: 'attempted_delivery',
      message: reason ? `Delivery attempted (NDR): ${reason}` : 'Delivery attempted (NDR)',
      tags: ['NDR'],
    };
  }
  if (isRtoStatus(lower)) {
    return {
      status: 'attempted_delivery',
      message: lower.includes('delivered')
        ? 'RTO delivered - shipment returned to origin'
        : 'RTO in transit - shipment returning to origin',
      tags: [lower.includes('delivered') ? 'RTO Delivered' : 'RTO'],
    };
  }
  if (isPickedUpStatus(lower)) {
    return { status: 'carrier_picked_up' };
  }
  if (isInTransitStatus(lower)) {
    return { status: 'in_transit' };
  }
  if (isBookingStatus(lower)) {
    return { status: 'confirmed' };
  }
  return null;
}

async function syncShopifyOrderTags(apiBase, headers, shopifyOrderId, tags) {
  const wanted = (Array.isArray(tags) ? tags : [tags]).map((tag) => singleLine(tag, 40)).filter(Boolean);
  if (!wanted.length) return false;

  const current = await shopifyJson(`${apiBase}/orders/${shopifyOrderId}.json`, { headers }, 12000);
  if (!current.ok) return false;

  const existing = String(current.data?.order?.tags || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
  const missing = wanted.filter(
    (tag) => !existing.some((item) => item.toLowerCase() === tag.toLowerCase())
  );
  if (!missing.length) return true;

  const updated = await shopifyJson(
    `${apiBase}/orders/${shopifyOrderId}.json`,
    {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        order: { id: shopifyOrderId, tags: [...existing, ...missing].join(', ') },
      }),
    },
    12000
  );
  if (!updated.ok) {
    console.warn(
      `Shopify order tags update failed for ${shopifyOrderId} (${updated.status}):`,
      updated.data
    );
    return false;
  }
  return true;
}

async function cancelShopifyFulfillment(apiBase, headers, fulfillmentId) {
  const cancelled = await shopifyJson(
    `${apiBase}/fulfillments/${fulfillmentId}/cancel.json`,
    { method: 'POST', headers, body: JSON.stringify({}) },
    12000
  );
  if (!cancelled.ok) {
    console.warn(
      `Shopify fulfillment cancel failed (${cancelled.status}):`,
      cancelled.data
    );
    return false;
  }
  return true;
}

async function postFulfillmentEvent(apiBase, headers, fulfillmentId, status, message = '', shopifyOrderId = null) {
  if (!fulfillmentId || !status) return false;

  // The documented REST path requires order_id: /orders/{order_id}/fulfillments/{id}/events.json
  const orderSegment = shopifyOrderId ? `orders/${shopifyOrderId}/` : '';
  const eventsUrl = `${apiBase}/${orderSegment}fulfillments/${fulfillmentId}/events.json`;

  const existing = await shopifyJson(eventsUrl, { headers }, 12000);
  const events = existing.data?.fulfillment_events || existing.data?.events || [];
  const already = events.some(
    (event) => String(event?.status || '').toLowerCase() === String(status).toLowerCase()
  );
  if (already) return true;

  const body = { event: { status } };
  if (message) body.event.message = singleLine(message, 255);

  const posted = await shopifyJson(
    eventsUrl,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    },
    12000
  );
  if (!posted.ok) {
    console.warn(
      `Shopify fulfillment event "${status}" failed (${posted.status}):`,
      posted.data
    );
    return false;
  }
  return true;
}

async function markLocalFulfilled(order) {
  if (!order?.update) return;
  if (String(order.fulfillmentStatus || '').toLowerCase() === 'fulfilled') return;
  await order.update({ fulfillmentStatus: 'fulfilled' });
}

// A cancelled pickup/shipment must never stay flagged as fulfilled. If an
// earlier sync (before cancel detection was fixed) set fulfillmentStatus to
// 'fulfilled' on a now-cancelled order, clear it back to 'pending' so the
// order list and any re-sync treat it as unfulfilled again.
async function unmarkLocalFulfilled(order) {
  if (!order?.update) return;
  if (String(order.fulfillmentStatus || '').toLowerCase() !== 'fulfilled') return;
  await order.update({ fulfillmentStatus: 'pending' });
}

/**
 * Create / refresh Shopify fulfillment from a LogixMitra order.
 * Safe to call repeatedly: skips closed FOs, updates tracking, posts delivered events.
 */
async function fulfillShopifyOrder(order, extras = {}) {
  if (!isShopifyOrder(order)) return { skipped: true, reason: 'not_shopify' };

  const shopifyOrderId = numericShopifyOrderId(order);
  if (!shopifyOrderId) {
    console.warn(`fulfillShopifyOrder skip ${order.referenceId}: missing shopifyOrderId`);
    return { skipped: true, reason: 'missing_shopify_order_id' };
  }

  const cancelledStatus = isCancelledStatus(order.status);
  const { awb, company, url } = trackingInfo(order, extras.awb, extras.courier);
  if (!cancelledStatus && (!awb || awb === '-')) {
    return { skipped: true, reason: 'missing_awb' };
  }

  const integration = await findShopifyIntegration(order);
  if (!integration?.credentials) {
    console.warn(
      `fulfillShopifyOrder skip ${order.referenceId}: Shopify integration not found for user ${order.user_id || order.seller}`
    );
    return { skipped: true, reason: 'no_integration' };
  }

  const { shop, token } = await getShopifyAccessToken(integration.credentials);
  const apiBase = `https://${shop}.myshopify.com/admin/api/${SHOPIFY_API_VERSION}`;
  const headers = {
    'X-Shopify-Access-Token': token,
    'Content-Type': 'application/json',
  };

  const foRes = await shopifyJson(
    `${apiBase}/orders/${shopifyOrderId}/fulfillment_orders.json`,
    { headers }
  );
  if (!foRes.ok) {
    console.error(
      `fulfillment_orders failed for ${order.referenceId} (${shopifyOrderId}):`,
      foRes.status,
      foRes.data
    );
    throw new Error(`fulfillment_orders failed: ${foRes.status}`);
  }

  const openFos = openFulfillmentOrders(foRes.data?.fulfillment_orders);
  let fulfillmentId = null;

  // Cancelled in LogixMitra: cancel existing Shopify fulfillments only.
  // Never create a new fulfillment (that would email a shipping notification).
  if (cancelledStatus) {
    const existingF = await shopifyJson(
      `${apiBase}/orders/${shopifyOrderId}/fulfillments.json`,
      { headers }
    );
    const fulfillments = (existingF.data?.fulfillments || []).filter(
      (item) => String(item?.status || '').toLowerCase() !== 'cancelled'
    );
    let cancelledAny = false;
    for (const item of fulfillments) {
      if (!item?.id) continue;
      const cancelled = await cancelShopifyFulfillment(apiBase, headers, item.id);
      if (cancelled) cancelledAny = true;
    }
    if (cancelledAny) {
      console.log(`Shopify fulfillment cancelled for ${order.referenceId}`);
    }
    // Clear any stale local 'fulfilled' flag so a re-sync / order list never
    // shows this cancelled shipment as picked up / fulfilled again.
    await unmarkLocalFulfilled(order);
    return { success: true, cancelled: true };
  }

  if (openFos.length) {
    const created = await shopifyJson(
      `${apiBase}/fulfillments.json`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fulfillment: {
            notify_customer: true,
            tracking_info: { number: awb, company, url },
            line_items_by_fulfillment_order: openFos.map((fo) => ({
              fulfillment_order_id: fo.id,
            })),
          },
        }),
      }
    );
    if (!created.ok || !created.data?.fulfillment?.id) {
      console.error(
        `Create fulfillment failed for ${order.referenceId}:`,
        created.status,
        created.data
      );
      throw new Error(`create fulfillment failed: ${created.status}`);
    }
    fulfillmentId = created.data.fulfillment.id;
    console.log(
      `Shopify fulfilled ${order.referenceId} (shopify ${shopifyOrderId}, fulfillment ${fulfillmentId})`
    );
  } else {
    const existingF = await shopifyJson(
      `${apiBase}/orders/${shopifyOrderId}/fulfillments.json`,
      { headers }
    );
    const fulfillments = (existingF.data?.fulfillments || []).filter(
      (item) => String(item?.status || '').toLowerCase() !== 'cancelled'
    );
    const latest = fulfillments[0];
    if (!latest?.id) {
      console.warn(
        `fulfillShopifyOrder ${order.referenceId}: no open fulfillment orders and no existing fulfillments`
      );
      return { skipped: true, reason: 'no_fulfillment_orders' };
    }
    fulfillmentId = latest.id;
    const currentTracking = String(latest.tracking_number || '');
    if (currentTracking !== awb) {
      const tracked = await shopifyJson(
        `${apiBase}/fulfillments/${fulfillmentId}/update_tracking.json`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            fulfillment: {
              notify_customer: false,
              tracking_info: { number: awb, company, url },
            },
          }),
        }
      );
      if (!tracked.ok) {
        console.warn(
          `update_tracking failed for ${order.referenceId}:`,
          tracked.status,
          tracked.data
        );
      }
    }
  }

  const event = mapStatusToFulfillmentEvent(order.status, order.ndrreason);

  if (fulfillmentId && event?.status) {
    await postFulfillmentEvent(
      apiBase,
      headers,
      fulfillmentId,
      event.status,
      event.message,
      shopifyOrderId
    );
  }

  // Shopify has no event for RTO/NDR, so mirror them as order tags for the store admin.
  if (event?.tags?.length) {
    await syncShopifyOrderTags(apiBase, headers, shopifyOrderId, event.tags);
  }

  if (!isCancelledStatus(order.status)) {
    await markLocalFulfilled(order);
  }

  return { success: true, fulfillmentId, event: event?.status || null };
}

module.exports = {
  fulfillShopifyOrder,
  isShopifyOrder,
  numericShopifyOrderId,
  mapStatusToFulfillmentEvent,
  isCancelledStatus,
};

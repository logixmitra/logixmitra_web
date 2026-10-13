


const axios = require('axios');
const Order = require('../models/Order');
const Integration=require('../models/Integration');
const { Op } = require('sequelize');
const innofulfillService = require('./innofulfillService');
const xpressbeesService = require('./xpressbeesService');
const { fulfillShopifyOrder, isShopifyOrder } = require('./shopifyFulfillment');
require('dotenv').config();

function fetchWithTimeout(url, options = {}, ms = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

async function getInnufillTracking(orderId) {
  return innofulfillService.trackByAwb(orderId);
}

async function getEkartToken() {
  try {
    let response = await fetchWithTimeout(
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
      },
      20000
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.log("EKART TOKEN ERROR:", err.message);
    return null;
  }
}

async function getEkartTracking(orderId) {
  try {
    const tokenData = await getEkartToken();
    const token = tokenData?.access_token || tokenData?.data?.access_token || tokenData?.token;

    if (!token) {
      throw new Error('Ekart token not received');
    }

    const trackingRes = await axios.get(
      `https://app.elite.ekartlogistics.in/data/v1/elite/track/${orderId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 20000
      }
    );

    return {
      success: true,
      data: trackingRes.data
    };
  } catch (error) {
    console.error(`Ekart tracking error for ${orderId}:`, error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

function getAccountDetails(weight, zone) {
         zone = String(zone || "").toUpperCase();
 
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
function mapGenericCourierStatus(raw) {
  const s = String(raw || '').toLowerCase().replace(/[_-]+/g, ' ').trim();
  if (!s) return null;
  if (s.includes('cancel')) return 'Cancelled';
  if (s.includes('rto') && s.includes('deliver')) return 'RTO Delivered';
  if (s.includes('rto') || s.includes('return to origin') || s.includes('return to seller')) return 'RTO In transit';
  if (s.includes('undeliver') || s.includes('ndr')) return 'UNDELIVERED';
  if (s.includes('out for delivery') || s === 'ofd') return 'Out for Delivery';
  if (s.includes('out for pickup')) return 'Out for Pickup';
  if (s.includes('not picked') || s.includes('shipment not received')) return 'Out for Pickup';
  if (s.includes('data received') || s.includes('package received') || s.includes('shipment booked') || s.includes('booked')) return 'Label Created';
  if (s.includes('deliver')) return 'Delivered';
  if (s.includes('picked') || s.includes('pickup complete') || s === 'pickup') return 'Picked Up';
  if (s.includes('manifest')) return 'Manifested';
  if (s.includes('label')) return 'Label Created';
  if (s.includes('shipped')) return 'Shipped';
  if (s.includes('in transit') || s.includes('dispatched')) return 'In Transit';
  if (s.includes('pickup')) return 'Out for Pickup';
  return null;
}

function mapShadowfaxStatus(raw) {
  const s = String(raw || '').toLowerCase().replace(/[_-]+/g, ' ').trim();
  if (!s) return null;
  if ((s.includes('rto') || s.includes('rts')) && s.includes('deliver')) return 'RTO Delivered';
  if (s.includes('rto') || s.includes('rts') || s.includes('return to seller') || s.includes('return to origin')) {
    return 'RTO In transit';
  }
  if (s.includes('undeliver') || s.includes('ndr') || s === 'cid') return 'UNDELIVERED';
  if (s.includes('out for delivery') || s === 'ofd') return 'Out for Delivery';
  if (s.includes('out for pickup') || s.includes('assigned for pickup') || s === 'ofp') return 'Out for Pickup';
  if (s.includes('deliver')) return 'Delivered';
  if (s.includes('picked') || s.includes('pickup complete') || s === 'pickup') return 'Picked Up';
  if (
    s.includes('in transit') ||
    s.includes('received at') ||
    s.includes('hub') ||
    s.includes('connected') ||
    s.includes('inscan') ||
    s.includes('warehouse')
  ) {
    return 'In Transit';
  }
  if (s.includes('cancel')) return 'Cancelled';
  if (s.includes('assigned') || s.includes('received') || s.includes('manifest') || s.includes('new')) {
    return 'Out for Pickup';
  }
  return mapGenericCourierStatus(raw);
}

function unwrapShadowfaxPayload(raw) {
  let payload = raw || {};
  if (payload.data && (payload.data.order_details || payload.data.tracking_details)) {
    payload = payload.data;
  }
  return payload;
}

const getDelhiveryTracking = async (orderOrAwb) => {
  const isOrder = orderOrAwb && typeof orderOrAwb === 'object';
  const awb = isOrder ? orderOrAwb.awb : orderOrAwb;
  const order = isOrder ? orderOrAwb : { awb };
  const url = `https://track.delhivery.com/api/v1/packages/json/?waybill=${awb}`;
  
  console.log(`Fetching Delhivery tracking for waybill: ${awb}`);





   const items = Array.isArray(order.items) ? order.items : [];
   const totalWeightKG = items.reduce((sum, item) => {
    return sum + Number(item.deadWeight || 0) * Number(item.quantity || 1);
  }, 0);

  // Delhivery create API expects weight in grams
  const weightInGrams = Math.max(100, Math.round((totalWeightKG || 0.5) * 1000));




      let deltoken=getAccountDetails(weightInGrams / 1000, String(order?.zone || "").replaceAll("ZONE ", "").toUpperCase())
        || process.env.DELHIVERY_TOKEN;

  
  try {
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        'Authorization': `Token ${deltoken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    }, 20000);

    if (!response.ok) {
      console.error(`Delhivery API Error ${response.status}:`, await response.text());
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }

    const data = await response.json();
    console.log("Delhivery Tracking Response:", JSON.stringify(data, null, 2));
    
    if (!data || !data.ShipmentData || data.ShipmentData.length === 0) {
      return {
        success: false,
        error: 'No tracking data found for this waybill'
      };
    }

    return {
      success: true,
      data: data
    };
  } catch (error) {
    console.error("Delhivery Fetch Error:", error.message);
    return {
      success: false,
      error: error.message
    };
  }
};


const getShadowfaxTracking = async (lrnum) => {
  if (!lrnum) {
    return { success: false, error: 'AWB is required' };
  }
  if (!process.env.SHADOWFAX_TOKEN) {
    return { success: false, error: 'SHADOWFAX_TOKEN is not configured' };
  }

  const encoded = encodeURIComponent(String(lrnum).trim());
  // Create uses v3; v4 track often 404s for the same AWB.
  const urls = [
    `https://dale.shadowfax.in/api/v3/clients/orders/${encoded}/track/`,
    `https://dale.shadowfax.in/api/v4/clients/orders/${encoded}/track/`,
  ];

  console.log(`Fetching Shadowfax tracking for request ID: ${lrnum}`);

  let lastError = null;
  for (const url of urls) {
    try {
      const response = await fetchWithTimeout(url, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${process.env.SHADOWFAX_TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }, 20000);

      const bodyText = await response.text();
      if (!response.ok) {
        lastError = `HTTP ${response.status}: ${bodyText || response.statusText}`;
        console.error(`Shadowfax API Error ${response.status} (${url}):`, bodyText);
        continue;
      }

      let data = {};
      try {
        data = bodyText ? JSON.parse(bodyText) : {};
      } catch (parseErr) {
        lastError = `Invalid JSON from ${url}`;
        continue;
      }

      console.log("Shadowfax Tracking Response:", JSON.stringify(data, null, 2));

      const payload = unwrapShadowfaxPayload(data);
      if (payload?.errors || payload?.error) {
        lastError = payload.errors || payload.error || payload.message || 'Shadowfax tracking error';
        continue;
      }
      if (!payload || (!payload.order_details && !payload.tracking_details && !payload.status && !payload.status_display)) {
        lastError = 'No tracking data found for this waybill';
        continue;
      }

      return {
        success: true,
        data: payload
      };
    } catch (error) {
      lastError = error.message;
      console.error("Shadowfax Fetch Error:", error.message);
    }
  }

  return {
    success: false,
    error: lastError || 'No tracking data found for this waybill'
  };
};

async function getXpressbeesTracking(awb) {
  try {
    const xpressbeesService = require('./xpressbeesService');
    return await xpressbeesService.trackShipment(awb);
  } catch (error) {
    console.error('Xpressbees tracking error:', error.message);
    return { success: false, error: error.message };
  }
}

async function getBlueDartTracking(awb) {
  try {
    const bluedartService = require('./bluedartService');
    return await bluedartService.trackShipment(awb);
  } catch (error) {
    console.error('BlueDart tracking error:', error.message);
    return { success: false, error: error.message };
  }
}

// Helper function to extract delivered date and time from tracking history
function extractDeliveredDateTime(trackingHistory, courierType) {
  let deliveredDate = null;
  let deliveredTime = null;
  
  if (!trackingHistory || !Array.isArray(trackingHistory)) {
    return { deliveredDate, deliveredTime };
  }
  
  // Find the delivered/out_for_delivery event
  let deliveredEvent = null;
  
  if (courierType === 'Shree Maruti Courier' || courierType === 'Innufill') {
    deliveredEvent = trackingHistory.find(event => 
      event.state === 'DELIVERED' || 
      event.state?.toUpperCase() === 'DELIVERED' ||
      event.status === 'DELIVERED'
    );
  } 
  else if (courierType === 'eKART') {
    deliveredEvent = trackingHistory.find(event => 
      event.status === 'delivered' ||
      event.status?.toLowerCase() === 'delivered'
    );
  }
  else if (courierType === 'Delhivery') {
    deliveredEvent = trackingHistory.find(event => 
      event.Status?.toLowerCase() === 'delivered'
    );
  }
  else if (courierType === 'Shadowfax') {
    deliveredEvent = trackingHistory.find((event) => {
      const value = String(event.status || event.status_display || event.remarks || '').toLowerCase();
      return value.includes('delivered') && !value.includes('undeliver') && !value.includes('rto');
    });
  }
  
  if (deliveredEvent) {
    let timestamp = null;
    
    if (courierType === 'Shree Maruti Courier' || courierType === 'Innufill') {
      timestamp = deliveredEvent.createdAt || deliveredEvent.timestamp;
    }
    else if (courierType === 'eKART') {
      timestamp = deliveredEvent.udate || deliveredEvent.timestamp;
    }
    else if (courierType === 'Delhivery') {
      timestamp = deliveredEvent.ScanDate;
    }
    else if (courierType === 'Shadowfax') {
      timestamp = deliveredEvent.created || deliveredEvent.timestamp || deliveredEvent.event_time || deliveredEvent.date;
    }
    
    if (timestamp) {
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) {
        deliveredDate = date.toISOString().split('T')[0]; // YYYY-MM-DD format
        deliveredTime = date.toLocaleTimeString('en-IN', { 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit',
          hour12: false 
        });
      }
    }
  }
  
  return { deliveredDate, deliveredTime };
}

async function updateOrderStatus(order, trackingData, courierType, options = {}) {
  let status = order.status;
  let trackingHistory = null;
  let currentStatus = null;
  let deliveredDate = order.deliveredDate;
  let deliveredTime = order.deliveredTime;

  if (courierType == "Shree Maruti Courier" && trackingData.success && trackingData.data?.data) {
    const innufillData = trackingData.data.data;
    currentStatus = innufillData.orderStatus;
    trackingHistory = innufillData.orderStateInfo;

    switch(currentStatus) {
      case 'DELIVERED':
        status = 'Delivered';
        break;
      case 'OUT_FOR_DELIVERY':
        status = 'Out for Delivery';
        break;
      case 'IN_TRANSIT':
        status = 'In Transit';
        break;
      case 'IN_PROCESS':
        status = 'Processing';
        break;
      case 'CANCELLED':
        status = 'Cancelled';
        break;
      case 'RTO':
        status = 'RTO In transit';
        break;
      default:
        status = currentStatus?.replace(/_/g, ' ') || order.status;
    }

    // Extract delivered date and time if status is Delivered
    if (status === 'Delivered') {
      const { deliveredDate: newDate, deliveredTime: newTime } = extractDeliveredDateTime(trackingHistory, 'Shree Maruti Courier');
      if (newDate) deliveredDate = newDate;
      if (newTime) deliveredTime = newTime;
    }

  } else if (courierType === "eKART" && trackingData.success && trackingData.data) {
    const awbNumber = order.awb;
    const payload = trackingData.data || {};
    const ekartKey = Object.keys(payload).find(
      (key) => String(key).toLowerCase() === String(awbNumber).toLowerCase()
    );
    const ekartData = (ekartKey && payload[ekartKey]) || payload[awbNumber] || payload.data?.[awbNumber] || (payload.history ? payload : null);

    if (!ekartData) {
      console.log(`No eKART data found for AWB: ${awbNumber}`);
      return false;
    }

    if (ekartData.history && ekartData.history.length > 0) {
      trackingHistory = ekartData.history;
      const latestEvent = ekartData.history[0];
      currentStatus = latestEvent.status;

      switch(currentStatus) {
        case 'delivered':
          status = 'Delivered';
          break;
        case 'out_for_delivery':
          status = 'Out for Delivery';
          break;
        case 'in_transit':
          status = 'In Transit';
          break;
        case 'pickup_complete':
          status = 'Picked Up';
          break;
        case 'shipment_created':
          status = 'Label Created';
          break;
        case 'pickup_scheduled':
          status = 'Pickup Scheduled';
          break;
        case 'out_for_pickup':
          status = 'Out for Pickup';
          break;
        case 'shipment_expected':
          status = 'Shipment Expected';
          break;
        case 'undelivered_due_to_request_for_reschedule':
          status = 'Rescheduled';
          break;
        case 'rto_delivered':
          status = 'RTO Delivered';
          break;
        case 'rto_in_transit':
          status = 'RTO In transit';
          break;
        default:
          if (String(currentStatus || '').toLowerCase().includes('undelivered')) {
            status = 'UNDELIVERED';
          } else if (String(currentStatus || '').toLowerCase().includes('rto_delivered')) {
            status = 'RTO Delivered';
          } else if (String(currentStatus || '').toLowerCase().includes('rto')) {
            status = 'RTO In transit';
          } else {
            status = currentStatus?.replace(/_/g, ' ') || order.status;
          }
      }
    }

    if (ekartData.delivered === true) {
      status = 'Delivered';
    }

    // Extract delivered date and time if status is Delivered
    if (status === 'Delivered') {
      const { deliveredDate: newDate, deliveredTime: newTime } = extractDeliveredDateTime(trackingHistory, 'eKART');
      if (newDate) deliveredDate = newDate;
      if (newTime) deliveredTime = newTime;
    }
    
  } else if (courierType === "Delhivery" && trackingData.success && trackingData.data) {

    const shipmentData = trackingData.data.ShipmentData[0].Shipment;
    // console.log("Delhivery Shipment Data:", shipmentData);



    
    if (!shipmentData) {
      console.log(`No Delhivery data found for waybill: ${order.awb}`);
      return false;
    }

    const scans = shipmentData.Scans || [];
    trackingHistory = scans;
    
    if (scans.length > 0) {
      const latestScan = scans[scans.length - 1];
      currentStatus = latestScan.Status;
      console.log(`Latest Delhivery scan status for ${order.awb}:`, currentStatus);
      
      switch(currentStatus?.toLowerCase()) {
        case 'delivered':
          status = 'Delivered';
          break;
        case 'out for delivery':
          status = 'Out for Delivery';
          break;
    
        case 'in_transit':
          status = 'In Transit';
          break;
        case 'pickup scheduled':
          status = 'Pickup Scheduled';
          break;
        case 'picked up':
        case 'pickup_complete':
          status = 'Picked Up';
          break;
        case 'shipment created':
        case 'label generated':
          status = 'Label Created';
          break;
        case 'rto delivered':
        case 'rto_delivered':
          status = 'RTO Delivered';
          break;
        case 'rto initiated':
        case 'rto in transit':
        case 'rto_in_transit':
          status = 'RTO In transit';
          break;
        case 'undelivered':
          status = 'UNDELIVERED';
          break;
        case 'cancelled':
          status = 'Cancelled';
          break;
        default:
          if (String(currentStatus || '').toLowerCase().includes('undelivered')) {
            status = 'UNDELIVERED';
          } else if (String(currentStatus || '').toLowerCase().includes('rto')) {
            status = String(currentStatus || '').toLowerCase().includes('delivered')
              ? 'RTO Delivered'
              : 'RTO In transit';
          } else {
            status = currentStatus || order.status;
      // console.log(`2222222222Latest Delhivery scan status for ${order.awb}:`, status);

          }
      }
    }
    
    if (shipmentData.Status?.Status?.toLowerCase() === 'delivered') {
      status = 'Delivered';
    } else if (status === order.status) {
      const mappedShipment = mapGenericCourierStatus(shipmentData.Status?.Status);
      if (mappedShipment) status = mappedShipment;
    }
      // console.log(`333333333 Delhivery scan status for ${order.awb}:`, status);
  

    // Extract delivered date and time if status is Delivered
    if (status === 'Delivered') {
      const { deliveredDate: newDate, deliveredTime: newTime } = extractDeliveredDateTime(trackingHistory, 'Delhivery');
      if (newDate) deliveredDate = newDate;
      if (newTime) deliveredTime = newTime;
    }
    deliveredDate=shipmentData?.DeliveryDate?.split("T")?.[0] || deliveredDate || null
    deliveredTime=shipmentData?.DeliveryDate?.split("T")?.[1]?.split(".")?.[0] || deliveredTime || null




    
// if(order.awb==="59757110022105"){

//     const fs = require("fs/promises");
//     await fs.writeFile(
//       "./statusss.json",
//       JSON.stringify({...shipmentData,status}, null, 2), // Pretty format
//       "utf8"
//     )
//   }


// return 

  } else if (String(courierType || '').toLowerCase().includes('shadowfax')) {
    const payload = unwrapShadowfaxPayload(trackingData.data || trackingData);
    const details = payload.order_details || {};
    const history =
      payload.tracking_details ||
      payload.history ||
      payload.tracking_history ||
      [];
    const historyArr = Array.isArray(history) ? history : [];
    trackingHistory = historyArr;
    const latest = historyArr[historyArr.length - 1] || historyArr[0] || {};
    const statusCandidate = (value) => {
      if (value == null || value === '' || typeof value === 'boolean') return null;
      return String(value);
    };
    currentStatus =
      statusCandidate(details.status_display) ||
      statusCandidate(details.current_status) ||
      statusCandidate(details.status) ||
      statusCandidate(payload.status_display) ||
      statusCandidate(payload.current_status) ||
      statusCandidate(payload.status) ||
      statusCandidate(latest.status_display) ||
      statusCandidate(latest.status) ||
      statusCandidate(latest.event_code) ||
      statusCandidate(latest.remarks) ||
      statusCandidate(latest.message);
    const mapped = mapShadowfaxStatus(currentStatus);
    if (mapped) {
      status = mapped;
    } else if (currentStatus) {
      console.warn(
        `Unmapped Shadowfax status for ${order.awb}:`,
        currentStatus
      );
    }
    if (status === 'Delivered') {
      const { deliveredDate: newDate, deliveredTime: newTime } = extractDeliveredDateTime(
        trackingHistory,
        'Shadowfax'
      );
      if (newDate) deliveredDate = newDate;
      if (newTime) deliveredTime = newTime;
    }
    const deliveryTs =
      details.delivered_at ||
      details.delivery_date ||
      details.delivered_date;
    if (status === 'Delivered' && deliveryTs) {
      const date = new Date(deliveryTs);
      if (!Number.isNaN(date.getTime())) {
        deliveredDate = date.toISOString().split('T')[0];
        deliveredTime = date.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        });
      }
    }

  } else if (
    courierType === 'Xpressbees' ||
    courierType === 'BlueDart'
  ) {
    const payload = trackingData.data || {};
    const history =
      trackingData.history ||
      payload.history ||
      payload.tracking_history ||
      payload.scan ||
      payload.scans ||
      payload.tracking ||
      payload.ShipmentData?.Shipment?.[0]?.Scans ||
      [];
    const historyArr = Array.isArray(history) ? history : [];
    trackingHistory = historyArr;
    const latest = historyArr[historyArr.length - 1] || historyArr[0] || {};
    currentStatus =
      trackingData.currentStatus ||
      trackingData.status ||
      payload.status ||
      payload.current_status ||
      payload.shipment_status ||
      payload.Status ||
      latest.status ||
      latest.message ||
      latest.event ||
      latest.Scan ||
      latest.Status;
    const mapped = trackingData.status || mapGenericCourierStatus(currentStatus);
    if (mapped) status = mapped;
    if (status === 'Delivered') {
      const { deliveredDate: newDate, deliveredTime: newTime } = extractDeliveredDateTime(trackingHistory, courierType);
      if (newDate) deliveredDate = newDate;
      if (newTime) deliveredTime = newTime;
    }
  }

  const isRtoLike = (s) => {
    const v = String(s || '').toLowerCase();
    return v.includes('rto') || v.includes('return to origin');
  };

  // Once RTO starts, do not flap back to In Transit from a later non-RTO scan.
  // That flap was causing Auto RTO (freight+GST) to debit again on the next RTO scan.
  const previousStatus = order.status;
  if (isRtoLike(previousStatus) && !isRtoLike(status)) {
    const next = String(status || '').toLowerCase();
    if (next.includes('deliver') && !next.includes('undeliver')) {
      status = 'RTO Delivered';
    } else {
      // Keep RTO even if courier later reports cancelled after a post-pickup cancel.
      status = previousStatus;
    }
  }

  // Cancelled is final: a courier's stale active scans ("Out for Pickup",
  // "Manifested"...) must never resurrect a cancelled order. Only courier
  // proof of RTO or actual delivery is allowed to move it.
  const isCancelledText = (v) => /cancel/i.test(String(v || ''));
  if (isCancelledText(previousStatus) && !isCancelledText(status)) {
    const next = String(status || '').toLowerCase();
    const isRtoStatus = next.includes('rto') || next.includes('return to origin');
    const isDeliveredStatus = next.includes('deliver') && !next.includes('undeliver');
    if (!isRtoStatus && !isDeliveredStatus) {
      status = previousStatus;
    }
  }

  // Persist fresh scans even when the status itself must stay sticky
  // (cancelled/RTO), and NEVER wipe a populated stored history with null
  // or an empty list when the courier simply returned no scans this time
  // (this was blanking BlueDart / Delhivery / Xpressbees histories).
  const hasFreshScans = Array.isArray(trackingHistory) && trackingHistory.length > 0;
  const hasStoredScans = Array.isArray(order.tracking_history) && order.tracking_history.length > 0;
  const shouldPersistHistory = trackingHistory != null && (hasFreshScans || !hasStoredScans);
  const historyChanged =
    shouldPersistHistory &&
    JSON.stringify(trackingHistory) !== JSON.stringify(order.tracking_history);

  // Backfill mode: persist ONLY the scans (+ delivery stamp when the order is
  // already Delivered and the courier agrees) — never touch `status`/`ndrreason`.
  // Used by scripts/backfillTrackingHistory.js so an old courier payload can
  // not resurrect or regress a terminal order while we fill missing history.
  if (options && options.historyOnly) {
    const orderIsDelivered =
      String(order.status || '').toLowerCase().includes('deliver') &&
      !String(order.status || '').toLowerCase().includes('undeliver');
    const fillDeliveryStamp =
      orderIsDelivered && status === 'Delivered' &&
      (deliveredDate !== order.deliveredDate || deliveredTime !== order.deliveredTime);
    if (historyChanged || fillDeliveryStamp) {
      await order.update({
        ...(shouldPersistHistory ? { tracking_history: trackingHistory } : {}),
        ...(fillDeliveryStamp ? { deliveredDate, deliveredTime } : {}),
      });
      console.log(
        `[historyOnly] Backfilled scans for ${order.referenceId}: ` +
        `${hasStoredScans ? 0 : trackingHistory.length} stored -> ${trackingHistory.length} scans`
      );
      return true;
    }
    return false;
  }

  // Update order if status changed or delivered date/time changed
  if (
    status !== order.status ||
    deliveredDate !== order.deliveredDate ||
    deliveredTime !== order.deliveredTime ||
    historyChanged
  ) {
    await order.update({
      status: status,
      trackingnumber: order.awb,
      ndrreason: trackingData.data?.data?.reason || trackingData.data?.reason || order.ndrreason || '',
      ...(shouldPersistHistory ? { tracking_history: trackingHistory } : {}),
      deliveredDate: deliveredDate,
      deliveredTime: deliveredTime
    });

    console.log(`Updated deliverideliveriorder ${order.referenceId}: Status: ${previousStatus} -> ${status}, Delivered Date: ${deliveredDate}, Delivered Time: ${deliveredTime}`);

    // Auto-deduct RTO freight+GST only on the first transition into RTO
    try {
      if (!order.rtoCharged && !isRtoLike(previousStatus) && isRtoLike(status)) {
        const orderService = require('./orderService');
        await orderService.deductAutoRtoCharge(order);
      }
    } catch (rtoErr) {
      console.error(
        `[deductAutoRtoCharge] Failed for ${order.referenceId}:`,
        rtoErr?.message || rtoErr
      );
    }

    return true;
  }

  return false;
}

async function  getToken(tmpdata) {
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


async function fulfillOrder(order, awb, courier) {
  try {
    return await fulfillShopifyOrder(order, { awb, courier });
  } catch (e) {
    console.log(e, "fulfillordererror");
    return { success: false, error: e.message };
  }
}






async function updateAllOrdersTracking() {
  console.log(`[${new Date().toISOString()}] Starting tracking update for all orders with AWB...`);

  try {
    const OrderItem = require('../models/OrderItem');
    const orders = await Order.findAll({
      where: {
        awb: {
          [Op.ne]: '-',
          [Op.not]: null
        },
        [Op.or]: [
          {
            status: {
              [Op.notIn]: ['Delivered', 'Cancelled', 'Canceled', 'RTO Delivered'],
            },
          },
          {
            platform: 'Shopify',
            status: 'Delivered',
            fulfillmentStatus: { [Op.or]: [null, { [Op.ne]: 'fulfilled' }] },
          },
        ],
      },
      include: [{ model: OrderItem, as: 'items', required: false }],
    });



    

    console.log(`Found ${orders.length} orders with AWB numbers to update`);

    let updatedCount = 0;
    let errorCount = 0;

    const BATCH_SIZE = 5;
    for (let i = 0; i < orders.length; i += BATCH_SIZE) {
      const batch = orders.slice(i, i + BATCH_SIZE);

      const promises = batch.map(async (order) => {
        try {
          const result = await withTimeout(processOrderTracking(order), 25000, `Order ${order.referenceId}`);
          if (result?.updated) updatedCount++;
          if (result?.error) errorCount++;
        } catch (error) {
          console.error(`Error processing order ${order.referenceId}:`, error.message);
          errorCount++;
        }
      });

      await Promise.all(promises);

      if (i + BATCH_SIZE < orders.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log(`[${new Date().toISOString()}] Tracking update completed. Updated: ${updatedCount}, Errors: ${errorCount}`);

    return {
      success: true,
      totalOrders: orders.length,
      updatedCount,
      errorCount
    };

  } catch (error) {
    console.error('Error in updateAllOrdersTracking:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function processOrderTracking(order) {
  let trackingData;
  let courierType = order.courier?.toLowerCase() || '';

  if (!order.awb || order.awb === '-') {
    console.log(`Order ${order.referenceId} has no valid AWB`);
    return { updated: false };
  }

  if (isShopifyOrder(order) && String(order.status) === 'Delivered') {
    try {
      await withTimeout(fulfillOrder(order), 25000, `fulfillOrder ${order.referenceId}`);
    } catch (fulfillErr) {
      console.warn(`fulfillOrder skipped for ${order.referenceId}:`, fulfillErr?.message);
    }
    return { updated: false };
  }

  let courierLabel = 'Shree Maruti Courier';
  if (courierType.includes('innufill') || courierType.includes('innofulfil') || courierType.includes('smc') || courierType.includes('shree maruti')) {
    console.log(`Fetching Innufill tracking for order ${order.referenceId}, AWB: ${order.awb}`);
    trackingData = await getInnufillTracking(order.awb);
    courierLabel = 'Shree Maruti Courier';
  } else if (courierType.includes('ekart')) {
    console.log(`Fetching eKART tracking for order ${order.referenceId}, AWB: ${order.awb}`);
    trackingData = await getEkartTracking(order.awb);
    courierLabel = 'eKART';
  } else if (courierType.includes('shadowfax')) {
    console.log(`Fetching Shadowfax tracking for order ${order.referenceId}, AWB: ${order.awb}`);
    trackingData = await getShadowfaxTracking(order.awb);
    courierLabel = 'Shadowfax';
  } else if (courierType.includes('delhivery') || courierType.includes('delivery')) {
    console.log(`Fetching Delhivery tracking for order ${order.referenceId}, AWB: ${order.awb}`);
    trackingData = await getDelhiveryTracking(order);
    courierLabel = 'Delhivery';
  } else if (courierType.includes('xpressbees') || courierType.includes('xpress bees')) {
    console.log(`Fetching Xpressbees tracking for order ${order.referenceId}, AWB: ${order.awb}`);
    trackingData = await getXpressbeesTracking(order.awb);
    courierLabel = 'Xpressbees';
  } else if (courierType.includes('bluedart') || courierType.includes('blue dart')) {
    console.log(`Fetching BlueDart tracking for order ${order.referenceId}, AWB: ${order.awb}`);
    trackingData = await getBlueDartTracking(order.awb);
    courierLabel = 'BlueDart';
  } else {
    console.log(`Unknown courier type "${courierType}" for order ${order.referenceId}`);
    return { updated: false };
  }

  console.log(trackingData, "Tracking data received");

  if (!trackingData?.success) {
    console.error(`Failed to get tracking for order ${order.referenceId}: ${trackingData?.error}`);
    return { error: true };
  }

  const updated = await updateOrderStatus(order, trackingData, courierLabel);
  if (isShopifyOrder(order)) {
    try {
      await withTimeout(
        fulfillOrder(order),
        25000,
        `fulfillOrder ${order.referenceId}`
      );
    } catch (fulfillErr) {
      console.warn(`fulfillOrder skipped for ${order.referenceId}:`, fulfillErr?.message);
    }
  }

  return { updated: !!updated };
}

async function getOrderTracking(referenceId) {
  try {
    const order = await Order.findOne({ where: { referenceId } });
    
    if (!order || !order.awb || order.awb === '-') {
      return { success: false, error: 'Order not found or has no AWB' };
    }
    
    let trackingData;
    const courierType = order.courier?.toLowerCase() || '';
    
    if (courierType.includes('shadowfax')) {
      trackingData = await getShadowfaxTracking(order.awb);
    } else if (courierType.includes('delhivery')) {
      trackingData = await getDelhiveryTracking(order.awb);
    } else if (courierType.includes('ekart')) {
      trackingData = await getEkartTracking(order.awb);
    } else if (courierType.includes('xpressbees') || courierType.includes('xpress bees')) {
      trackingData = await getXpressbeesTracking(order.awb);
    } else if (courierType.includes('bluedart') || courierType.includes('blue dart')) {
      trackingData = await getBlueDartTracking(order.awb);
    } else {
      trackingData = await getInnufillTracking(order.awb);
    }
    
    return trackingData;
  } catch (error) {
    console.error('Error getting order tracking:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  getInnufillTracking,
  getEkartTracking,
  getDelhiveryTracking,
  getShadowfaxTracking,
  getXpressbeesTracking,
  getBlueDartTracking,
  updateOrderStatus,
  updateAllOrdersTracking,
  getOrderTracking
};

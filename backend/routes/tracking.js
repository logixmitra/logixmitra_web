// routes/tracking.js
const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Wallet = require('../models/Wallet');
const User = require('../models/User');


const {
  getInnufillTracking,
  getEkartTracking,
  getDelhiveryTracking,getShadowfaxTracking,getXpressbeesTracking,getBlueDartTracking,
  updateOrderStatus
} = require('../services/trackingService');
const shopifyFulfillment = require('../services/shopifyFulfillment');

/**
 * GET /api/track/:awbNumber
 * Track order by AWB number
 */
router.get('/track/:awbNumber', async (req, res) => {
  try {
    const { awbNumber } = req.params;
    
    if (!awbNumber || awbNumber.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'AWB number is required'
      });
    }

    // First, find the order in database
    const order = await Order.findOne({
      where: {
        awb: awbNumber
      },
            include: [{
          model: OrderItem,
          as: 'items',
        }]
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'No shipment found with this AWB number'
      });
    }

    let trackingData;
    let courierType = order.courier || '';
    const courierLower = courierType.toLowerCase();
    let courierLabel = courierType;

    // Fetch tracking based on courier type
    if (courierLower.includes('innufill') || courierLower.includes('innofulfil') || courierLower.includes('smc') || courierLower.includes('shree maruti')) {
      trackingData = await getInnufillTracking(order.awb);
      courierLabel = 'Shree Maruti Courier';
    }
    else if (courierLower.includes('ekart')) {
      trackingData = await getEkartTracking(order.awb);
      courierLabel = 'eKART';
    }

    else if (courierLower.includes('shadowfax')) {     
      trackingData = await getShadowfaxTracking(order.awb);
      courierLabel = 'Shadowfax';
    console.log(JSON.stringify(trackingData), courierType);

    }
    else if (courierLower.includes('delhivery')) {
      trackingData = await getDelhiveryTracking(order);
      courierLabel = 'Delhivery';
    }
    else if (courierLower.includes('xpressbees') || courierLower.includes('xpress bees')) {
      trackingData = await getXpressbeesTracking(order.awb);
      courierLabel = 'Xpressbees';
    }
    else if (courierLower.includes('bluedart') || courierLower.includes('blue dart')) {
      trackingData = await getBlueDartTracking(order.awb);
      courierLabel = 'BlueDart';
    }

    
  
    else {
      return res.status(400).json({
        success: false,
        message: `Tracking not supported for courier: ${courierType}`
      });
    }
      console.log(JSON.stringify(trackingData), courierType);


    // No payload at all: open the modal with the stored data instead of a 500.
    if (!trackingData) {
      const stored = enrichTrackingResponse(
        buildStoredTrackingResponse(order, courierLabel, 'Live tracking unavailable'),
        order
      );
      return res.status(200).json({
        success: true,
        data: stored,
      });
    }

    if (trackingData.success) {
      try {
        await updateOrderStatus(order, trackingData, courierLabel);
      } catch (persistErr) {
        console.warn(`Failed to persist tracking status for ${order.awb}:`, persistErr?.message);
      }
      // Keep the Shopify order status in sync with the tracking status (non-blocking).
      try {
        if (shopifyFulfillment.isShopifyOrder(order)) {
          shopifyFulfillment
            .fulfillShopifyOrder(order)
            .catch((shopifyErr) =>
              console.warn(
                `Shopify status push failed for ${order.referenceId}:`,
                shopifyErr?.message || shopifyErr
              )
            );
        }
      } catch (shopifyErr) {
        console.warn(
          `Shopify status push failed for ${order.referenceId}:`,
          shopifyErr?.message || shopifyErr
        );
      }
    }

    // Format response based on courier type. Formatting must never crash the
    // endpoint (shape drift per courier / partial payloads on live errors) —
    // fall back to stored order data.
    let formattedResponse;
    try {
      formattedResponse = formatTrackingResponse(trackingData.data || trackingData, courierType, order);
    } catch (fmtErr) {
      console.warn(`formatTrackingResponse failed for ${order.awb}:`, fmtErr?.message);
      formattedResponse = buildStoredTrackingResponse(
        order,
        courierLabel,
        trackingData?.error || fmtErr?.message
      );
    }

    return res.status(200).json({
      success: true,
      data: enrichTrackingResponse(formattedResponse, order)
    });

  } catch (error) {
    console.error('Track order error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});


router.post('/transactions', async (req, res) => {
  const { orderId, type, amount, description } = req.body;

  // Validation
  if (!orderId || !type || !amount || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields:  orderId, type, amount (positive)'
    });
  }
  if (!['credit', 'debit'].includes(type)) {
    return res.status(400).json({ success: false, message: 'Type must be credit or debit' });
  }

  try {
    const order = await Order.findOne({
      where: {
        [Op.or]: [
          { id: orderId },
          { awb: orderId },
          { referenceId: orderId },
          { orderNumber: orderId },
        ],
      },
    });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found for this seller' });
    }

    const sellerId = order.seller || order.user_id;
    const seller = await User.findByPk(sellerId);
    if (!seller) {
      return res.status(404).json({ success: false, message: 'Seller not found' });
    }

    const parsedAmount = parseFloat(amount);
    if (type === 'debit' && (seller.walletBalance || 0) < parsedAmount) {
      return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
    }

    const walletEntry = await Wallet.create({
      user_id: seller.id,
      transid: order.awb && order.awb !== '-' ? order.awb : `TXN-${Date.now()}`,
      referenceId: order.referenceId,
      orderNumber: order.orderNumber,
      amount: parsedAmount,
      status: type === 'credit' ? 'Credited' : 'Debited',
      description: description || `Manual ${type} for ${order.awb || order.orderNumber || order.referenceId}`,
    });

    if (type === 'credit') {
      seller.walletBalance = (seller.walletBalance || 0) + parsedAmount;
    } else {
      seller.walletBalance = (seller.walletBalance || 0) - parsedAmount;
    }
    await seller.save();

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: walletEntry
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
});



/**
 * POST /api/track/bulk
 * Track multiple orders by AWB numbers
 */
router.post('/track/bulk', async (req, res) => {
  try {
    const { awbNumbers } = req.body;
    
    if (!awbNumbers || !Array.isArray(awbNumbers) || awbNumbers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of AWB numbers'
      });
    }

    if (awbNumbers.length > 20) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 20 AWB numbers per request'
      });
    }

    const results = [];
    
    for (const awbNumber of awbNumbers) {
      try {
        const order = await Order.findOne({
          where: {
            awb: awbNumber
          }
        });

        if (!order) {
          results.push({
            awbNumber,
            success: false,
            message: 'Order not found'
          });
          continue;
        }

        let trackingData;
        let courierType = order.courier;

        if (courierType === 'Innufill' || courierType === 'innofulfil' || courierType === 'innofulfill') {
          trackingData = await getInnufillTracking(order.awb);
        }
        else if (courierType === 'eKART' || courierType === 'Ekart' || courierType === 'ekart') {
          trackingData = await getEkartTracking(order.awb);
        }
        else {
          results.push({
            awbNumber,
            success: false,
            message: `Tracking not supported for courier: ${courierType}`
          });
          continue;
        }

        if (trackingData.success) {
          results.push({
            awbNumber,
            success: true,
            data: formatTrackingResponse(trackingData.data, courierType, order)
          });
        } else {
          results.push({
            awbNumber,
            success: false,
            message: 'Unable to fetch tracking information'
          });
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        results.push({
          awbNumber,
          success: false,
          message: error.message
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('Bulk tracking error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Helper function to format tracking response
 */

function formatShadowfaxHistory(shipmentData) {

  console.log(shipmentData,"shadowfaxdata")
  if (
    !shipmentData ||
    !shipmentData.tracking_details ||
    !Array.isArray(shipmentData.tracking_details)
  ) {
    return [];
  }

  const shipment = shipmentData.tracking_details;



  return shipment.map(scan => {
      
    return {
      status: formatDelhiveryStatus(scan.status),
      location: scan.location || "Unknown",
      timestamp: scan.created ,
      description:
       scan?.remarks || "", 
      completed:
        scan.status?.toLowerCase() === "delivered"
    };
  });
}
function sortHistoryNewestFirst(history) {
  if (!Array.isArray(history)) return [];
  return [...history].sort((a, b) => {
    const ta = new Date(a?.timestamp || a?.date || 0).getTime();
    const tb = new Date(b?.timestamp || b?.date || 0).getTime();
    if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
    if (Number.isNaN(ta)) return 1;
    if (Number.isNaN(tb)) return -1;
    return tb - ta;
  });
}

// ---- Stored-data fallbacks -------------------------------------------------
// Orders keep their own tracking_history JSON (written by updateOrderStatus).
// When the live courier payload is empty/failed, the modal must still show
// that history and both statuses instead of erroring out.

const STORED_HISTORY_TEXT_KEYS = [
  'Instructions', 'instructions',
  'description', 'Description',
  'remark', 'remarks', 'Remarks',
  'message', 'Message',
  'Scan', 'scan',
  'status', 'Status', 'state', 'State',
];
const STORED_HISTORY_TS_KEYS = [
  'timestamp', 'ScanDateTime', 'StatusDateTime', 'date', 'created',
  'createdAt', 'event_time', 'time', 'datetime',
];

function formatStoredTrackingHistory(raw) {
  let rows = [];
  if (Array.isArray(raw)) rows = raw;
  else if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      rows = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
    } catch (_) {
      rows = [];
    }
  } else if (raw && typeof raw === 'object') {
    for (const k of ['history', 'scans', 'tracking_history', 'data', 'activities', 'tracking', 'trackingDetails', 'results', 'orderStateInfo', 'statuses']) {
      if (Array.isArray(raw[k])) { rows = raw[k]; break; }
    }
    if (!rows.length) rows = [raw];
  }

  const tsOf = (e) => {
    for (const k of STORED_HISTORY_TS_KEYS) {
      const t = e?.[k] ?? e?.ScanDetail?.[k];
      if (t) {
        const n = new Date(t).getTime();
        if (!Number.isNaN(n) && n > 0) return n;
      }
    }
    return 0;
  };

  const mapped = rows
    .filter((e) => e && typeof e === 'object')
    .map((e) => {
      const detail = e.ScanDetail || e.scanDetail || e;
      let text = '';
      for (const k of STORED_HISTORY_TEXT_KEYS) {
        const v = detail[k] !== undefined && detail[k] !== null ? detail[k] : e[k];
        if (v !== undefined && v !== null && String(v).trim() && String(v).trim() !== '-') {
          text = String(v).replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
          break;
        }
      }
      const ts = STORED_HISTORY_TS_KEYS.map((k) => e[k] ?? detail[k]).find((v) => v) || null;
      return {
        status: text || 'Update',
        description: text || '',
        location:
          detail.ScannedLocation || detail.scannedLocation || detail.location ||
          e.location || 'Unknown',
        timestamp: ts,
        completed: text.toLowerCase().includes('delivered'),
      };
    })
    .filter((row) => row.status && row.status !== 'Update' ? true : Boolean(row.description));

  return sortHistoryNewestFirst(mapped);
}

function buildStoredTrackingResponse(order, courierLabel, reason) {
  return {
    awbNumber: order.awb,
    courier: courierLabel || order.courier || '—',
    status: order.status || 'Unknown',
    orderStatus: order.status,
    orderCancelReason: order.cancelReason || null,
    from: order.pickupLocation || 'Not specified',
    to:
      order.deliveryLocation ||
      `${order.city || ''}, ${order.state || ''}`.trim() ||
      'Not specified',
    estimatedDelivery: order.expectedDeliveryDate || 'Pending',
    currentStatus: order.status || 'Unknown',
    trackingHistory: formatStoredTrackingHistory(order.tracking_history),
    lastUpdated: new Date().toISOString(),
    source: 'stored',
    liveError: reason || null,
    orderDetails: {
      referenceId: order.referenceId,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      orderStatus: order.status,
      cancelReason: order.cancelReason || null,
    },
  };
}

/**
 * Always attach the panel's own order status (so the modal can show
 * "Order Status" next to the courier's live status), and fill gaps:
 * - empty history  -> stored tracking_history
 * - missing/"Unknown" status -> the order's own status
 */
function enrichTrackingResponse(response, order) {
  const resp = response && typeof response === 'object' ? response : {};
  resp.orderStatus = order.status;
  resp.orderCancelReason = order.cancelReason || null;

  const hasHistory = Array.isArray(resp.trackingHistory) && resp.trackingHistory.length > 0;
  if (!hasHistory) {
    resp.trackingHistory = formatStoredTrackingHistory(order.tracking_history);
  }

  const statusLower = String(resp.status || '').trim().toLowerCase();
  if (!statusLower || statusLower === 'unknown' || statusLower === 'not found') {
    resp.status = order.status || resp.status;
  }

  resp.orderDetails = {
    ...(resp.orderDetails || {}),
    referenceId: order.referenceId,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    orderStatus: order.status,
    cancelReason: order.cancelReason || null,
  };
  return resp;
}

function formatTrackingResponse(trackingData, courierType, order) {
  if (courierType === 'Innufill' || courierType === 'innofulfil' || courierType === 'innofulfill' ||  courierType.includes('SMC')) {
    const innufillData = trackingData.data?.data || trackingData.data || trackingData; 
    
    return {
      awbNumber: order.awb,
      courier: 'Innufill',
      status: formatStatus(innufillData.orderStatus),
      from: order.pickupLocation || 'Not specified',
      to: order.deliveryLocation || 'Not specified',
      estimatedDelivery: innufillData.expectedDeliveryDate || 'Pending',
      currentStatus: innufillData.orderStatus,
      trackingHistory: sortHistoryNewestFirst(formatInnufillHistory(innufillData.orderStateInfo || innufillData.statuses)),
      lastUpdated: new Date().toISOString(),
      orderDetails: {
        referenceId: order.referenceId,
        customerName: order.customerName,
        customerPhone: order.customerPhone
      }
    };
  } 
  else if (courierType === 'eKART' || courierType === 'Ekart' || courierType.toLowerCase().includes('ekart')) {
    // eKART service may nest rows under data / key by AWB with different
    // casing — resolve case-insensitively before giving up.
    const ekPayload = trackingData?.data || trackingData || {};
    const ekartData =
      ekPayload[order.awb] ||
      ekPayload[String(order.awb || '').toLowerCase()] ||
      ekPayload[String(order.awb || '').toUpperCase()] ||
      trackingData?.[order.awb] ||
      ekPayload;
    
    if (!ekartData) {
      return {
        awbNumber: order.awb,
        courier: 'eKART',
        status: 'Not Found',
        message: 'No tracking data available'
      };
    }

    const latestEvent = ekartData.history && ekartData.history[0];
    const status = ekartData.delivered ? 'Delivered' : formatEkartStatus(latestEvent?.status);
    return {
      awbNumber: order.awb,
      courier: 'eKART',
      status: status,
      from: order.pickupLocation || 'Not specified',
      to: order.deliveryLocation || 'Not specified',
      estimatedDelivery: ekartData.expectedDeliveryDate || 'Pending',
      currentStatus: latestEvent?.status || 'Unknown',
      trackingHistory: sortHistoryNewestFirst(formatEkartHistory(ekartData.history)),
      lastUpdated: new Date().toISOString(),
      orderDetails: {
        referenceId: order.referenceId,
        customerName: order.customerName,
        customerPhone: order.customerPhone
      }
    };
  }
  else if(courierType.toLowerCase().includes('delhivery')){
    const dlShip = trackingData?.ShipmentData?.[0] || {};
    const dlStatus = dlShip.Status || dlShip.Shipment?.Status || {};
    return {
      awbNumber: order.awb,
      courier: 'Delhivery',
      status: dlStatus?.Instructions || dlStatus?.Status || order.status || 'Unknown',
      from: order.pickupLocation || 'Not specified',
      to: order.deliveryLocation || 'Not specified',
      estimatedDelivery: trackingData.expectedDeliveryDate || 'Pending',
      currentStatus: dlStatus?.Instructions || dlStatus?.Status || 'Unknown',
      trackingHistory: sortHistoryNewestFirst(formatDelhiveryHistory(trackingData)),
      lastUpdated: new Date().toISOString(),
      orderDetails: { 
        referenceId: order.referenceId,
        customerName: order.customerName,
        customerPhone: order.customerPhone
      }
    };
    
  } 
   else if(courierType.toLowerCase().includes('shadowfax')){

   
    return {
      awbNumber: trackingData?.order_details?.awb_number || trackingData?.data?.order_details?.awb_number || order.awb,
      courier: 'Shadowfax',
      status:  trackingData?.order_details?.status_display || trackingData?.data?.order_details?.status_display || order.status || 'Unknown',
      from: order.order_details?.address_line_1 || 'Not specified',
      to: order?.deliveryLocation || 'Not specified',
      estimatedDelivery: trackingData?.expectedDeliveryDate || 'Pending',
      currentStatus: trackingData?.order_details?.status_display || trackingData?.data?.order_details?.status_display || order.status || 'Unknown',
      trackingHistory: sortHistoryNewestFirst(formatShadowfaxHistory(trackingData?.order_details ? trackingData : (trackingData?.data || trackingData))), 
      lastUpdated: new Date().toISOString(),
      orderDetails: { 
        referenceId: order.referenceId,
        customerName: order.customerName,
        customerPhone: order.customerPhone
      }
    };
    
  }
  else if (courierType.toLowerCase().includes('xpressbees') || courierType.toLowerCase().includes('xpress bees')) {
    const xb = trackingData?.data || trackingData || {};
    const history = xb.history || xb.tracking_history || xb.scan || xb.scans || xb.tracking || [];
    const historyArr = Array.isArray(history) ? history : [];
    const latest = historyArr[0] || {};
    const status =
      xb.status ||
      xb.current_status ||
      xb.shipment_status ||
      latest.status ||
      latest.message ||
      order.status ||
      'Unknown';

    return {
      awbNumber: order.awb,
      courier: 'Xpressbees',
      status: String(status).replace(/_/g, ' '),
      from: order.pickupLocation || 'Not specified',
      to: order.deliveryLocation || `${order.city || ''}, ${order.state || ''}`.trim() || 'Not specified',
      estimatedDelivery: xb.edd || xb.expected_delivery_date || 'Pending',
      currentStatus: status,
      trackingHistory: sortHistoryNewestFirst(historyArr.map((event) => ({
        status: String(event.status || event.message || event.event || 'Update').replace(/_/g, ' '),
        location: event.location || event.city || event.hub || 'Unknown',
        timestamp: event.timestamp || event.date || event.event_time || event.updated_at,
        description: event.remark || event.description || event.message || '',
        completed: String(event.status || '').toLowerCase().includes('delivered')
      }))),
      lastUpdated: new Date().toISOString(),
      orderDetails: {
        referenceId: order.referenceId,
        customerName: order.customerName,
        customerPhone: order.customerPhone
      }
    };
  }
  else if (courierType.toLowerCase().includes('bluedart') || courierType.toLowerCase().includes('blue dart')) {
    const bd = trackingData?.data || trackingData || {};
    // BlueDart service returns normalized rows as top-level `history`
    // (already {status, location, timestamp, description}). Prefer them —
    // the raw `data` block is often just API echo with zero scans.
    const serviceHistory = Array.isArray(trackingData?.history) && trackingData.history.length > 0
      ? trackingData.history
      : null;
    const shipment =
      bd.ShipmentData?.[0]?.Shipment ||
      bd.ShipmentData?.Shipment?.[0] ||
      bd.ShipmentData?.Shipment ||
      (Array.isArray(bd.Shipment) ? bd.Shipment[0] : bd.Shipment) ||
      bd.shipment ||
      // BlueDart service returns { success, data: { trackingData, shipment } }
      bd.trackingData?.Shipment ||
      bd.trackingData?.shipment ||
      bd.shipment ||
      bd;

    const scansRaw =
      shipment?.Scans?.ScanDetail ||
      shipment?.Scans ||
      shipment?.ScanDetail ||
      shipment?.scans ||
      [];
    const scans = Array.isArray(scansRaw)
      ? scansRaw
      : scansRaw
        ? [scansRaw]
        : [];

    const status =
      trackingData?.status ||
      shipment?.Status ||
      shipment?.CurrentStatus ||
      shipment?.StatusType ||
      shipment?.status ||
      scans[0]?.Scan ||
      scans[0]?.Status ||
      order.status ||
      'Unknown';

    const trackingHistory = serviceHistory
      ? sortHistoryNewestFirst(serviceHistory)
      : sortHistoryNewestFirst(scans.map((event) => {
          const detail = event.ScanDetail || event;
          return {
            status: String(
              detail.Scan || detail.Status || detail.ScanType || detail.ScanCode || 'Update'
            ).replace(/_/g, ' '),
            location:
              detail.ScannedLocation ||
              detail.Location ||
              detail.ScanLocation ||
              detail.City ||
              'Unknown',
            timestamp:
              detail.ScanDateTime ||
              detail.ScanDate ||
              detail.Date ||
              detail.ScanTime ||
              detail.timestamp,
            description:
              detail.Instructions ||
              detail.ScanGroupType ||
              detail.Description ||
              detail.Scan ||
              '',
            completed: String(
              detail.Scan || detail.Status || ''
            )
              .toLowerCase()
              .includes('delivered')
          };
        }));

    return {
      awbNumber: order.awb,
      courier: 'BlueDart',
      status: String(status).replace(/_/g, ' '),
      from: order.pickupLocation || 'Not specified',
      to:
        order.deliveryLocation ||
        `${order.city || ''}, ${order.state || ''}`.trim() ||
        'Not specified',
      estimatedDelivery:
        shipment?.ExpectedDelivery ||
        shipment?.ExpectedDeliveryDate ||
        shipment?.ExpectedDate ||
        'Pending',
      currentStatus: trackingData?.currentStatus || status,
      trackingHistory,
      lastUpdated: new Date().toISOString(),
      orderDetails: {
        referenceId: order.referenceId,
        customerName: order.customerName,
        customerPhone: order.customerPhone
      }
    };
  }
  
  
  return {
    awbNumber: order.awb,
    courier: courierType,
    status: order.status,
    message: 'Tracking format not available'
  };
}

function formatStatus(status) {
  const statusMap = {
    'DELIVERED': 'Delivered',
    'OUT_FOR_DELIVERY': 'Out for Delivery',
    'IN_TRANSIT': 'In Transit',
    'IN_PROCESS': 'Processing',
    'CANCELLED': 'Cancelled',
    'RTO': 'Return to Origin'
    
  };
  return statusMap[status] || status?.replace(/_/g, ' ') || 'Unknown';
}

function formatEkartStatus(status) {
  const statusMap = {
    'delivered': 'Delivered',
    'out_for_delivery': 'Out for Delivery',
    'in_transit': 'In Transit',
    'pickup_complete': 'Picked Up',
    'shipment_created': 'Label Created',
    'pickup_scheduled': 'Pickup Scheduled',
    'out_for_pickup': 'Out for Pickup',
    'shipment_expected': 'Shipment Expected',
    'undelivered_due_to_request_for_reschedule': 'Rescheduled',
    'rto_delivered': 'Return to Origin',
    'rto_in_transit': 'Return to Origin'
  };
  return statusMap[status] || status?.replace(/_/g, ' ') || 'In Transit';
}

function formatInnufillHistory(history) {
  if (!history || !Array.isArray(history)) return [];
  
  return history.map(event => {
    const state = event.state || event.status || '';
    return {
      status: String(state).replaceAll("_"," "),
      location: event.location || 'Unknown',
      timestamp: event.timestamp || event.date || event.createdAt,
      description: event.description || event.remarks || `${state} at ${event.location || 'Unknown'}`,
      completed: state === 'DELIVERED' || event.completed || false
    };
  });
}

function formatEkartHistory(history) {
  if (!history || !Array.isArray(history)) return [];
  
  return history.map(event => ({
    status: formatEkartStatus(event.status),
    location: event.location || 'Unknown',
    timestamp: event.timestamp || event.event_date ||event.date,
    description: event.remark || event.description || `${event.status} at ${event.location}`,
    completed: event.status === 'delivered' || false
  }));
}
function formatDelhiveryHistory(shipmentData) {
  if (
    !shipmentData ||
    !shipmentData.ShipmentData ||
    !Array.isArray(shipmentData.ShipmentData)
  ) {
    return [];
  }

  const shipment = shipmentData.ShipmentData[0]?.Shipment;

  if (!shipment || !Array.isArray(shipment.Scans) || shipment.Scans.length === 0) {
    return [];
  }

  return shipment.Scans.map(scanItem => {
    const scan = scanItem.ScanDetail || {};

    return {
      status: formatDelhiveryStatus(scan.Scan),
      location: scan.ScannedLocation || "Unknown",
      timestamp: scan.ScanDateTime || scan.StatusDateTime,
      description:
        scan.Instructions ||
        `${scan.Scan} at ${scan.ScannedLocation}`,
      completed:
        scan.Scan?.toLowerCase() === "delivered"
    };
  });
}


// Optional status formatter
function formatDelhiveryStatus(status) {
  if (!status) return "Unknown";

  const s = status.toLowerCase();

  switch (s) {
    case "manifested":
      return "Manifested";

    case "in transit":
      return "In Transit";

    case "out for delivery":
      return "Out For Delivery";

    case "delivered":
      return "Delivered";

    case "cancelled":
      return "Cancelled";

    case "rto":
      return "RTO";

    default:
      return status;
  }
}

module.exports = router;

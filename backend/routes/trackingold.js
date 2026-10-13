// routes/tracking.js
const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Wallet = require('../models/Wallet');
const User = require('../models/User');


const {
  getInnufillTracking,
  getEkartTracking,
  getDelhiveryTracking
} = require('../services/trackingService');

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
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'No shipment found with this AWB number'
      });
    }

    let trackingData;
    let courierType = order.courier;

    // Fetch tracking based on courier type
    if (courierType === 'Innufill' || courierType === 'innofulfil' || courierType === 'innofulfill' ||  courierType.includes('SMC')) {
      trackingData = await getInnufillTracking(order.awb);
    }
    else if (courierType === 'eKART' || courierType === 'Ekart' || courierType.toLowerCase().includes('ekart')) {
      trackingData = await getEkartTracking(order.awb);
    }

    else if (courierType.toLowerCase().includes('delhivery')) {
      trackingData = await getDelhiveryTracking(order.awb);
      console.log(trackingData,"delhiverydata")
    }

    
  
    else {
      return res.status(400).json({
        success: false,
        message: `Tracking not supported for courier: ${courierType}`
      });
    }

    if (!trackingData) {
      return res.status(500).json({
        success: false,
        message: 'Unable to fetch tracking information',
        error: trackingData.error
      });
    }

    // Format response based on courier type
    let formattedResponse = formatTrackingResponse(trackingData.data || trackingData, courierType, order);

    return res.status(200).json({
      success: true,
      data: formattedResponse
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
    // Verify seller exists
   

    // Verify order exists and belongs to seller
    const order = await Order.findOne({
      where: { id: orderId }
    });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found for this seller' });
    }
     const seller = await User.findByPk(order.seller);
    if (!seller) {
      return res.status(404).json({ success: false, message: 'Seller not found' });
    }

    // Generate a unique transaction ID (simple timestamp + random)

    // Create wallet entry
    const walletEntry = await Wallet.create({
      user_id: order.seller,
      transid: order.awb,
      referenceId: order.referenceId,
      amount: parseFloat(amount),
      status: type,    // or 'draft' if you need approval
      description: description || null
    });

    // Optionally update seller's wallet balance
    if (type === 'credit') {
      seller.walletBalance = (seller.walletBalance || 0) + parseFloat(amount);
    }else {
      seller.walletBalance = (seller.walletBalance || 0) - parseFloat(amount);
    }
    await seller.save();

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: walletEntry
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
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
function formatTrackingResponse(trackingData, courierType, order) {
  if (courierType === 'Innufill' || courierType === 'innofulfil' || courierType === 'innofulfill' ||  courierType.includes('SMC')) {
    const innufillData = trackingData.data || trackingData; 
    
    return {
      awbNumber: order.awb,
      courier: 'Innufill',
      status: formatStatus(innufillData.orderStatus),
      from: order.pickupLocation || 'Not specified',
      to: order.deliveryLocation || 'Not specified',
      estimatedDelivery: innufillData.expectedDeliveryDate || 'Pending',
      currentStatus: innufillData.orderStatus,
      trackingHistory: formatInnufillHistory(innufillData.orderStateInfo),
      lastUpdated: new Date().toISOString(),
      orderDetails: {
        referenceId: order.referenceId,
        customerName: order.customerName,
        customerPhone: order.customerPhone
      }
    };
  } 
  else if (courierType === 'eKART' || courierType === 'Ekart' || courierType.toLowerCase().includes('ekart')) {
    const ekartData = trackingData[order.awb];
    
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
      trackingHistory: formatEkartHistory(ekartData.history),
      lastUpdated: new Date().toISOString(),
      orderDetails: {
        referenceId: order.referenceId,
        customerName: order.customerName,
        customerPhone: order.customerPhone
      }
    };
  }
  else if(courierType.toLowerCase().includes('delhivery')){
    console.log(trackingData,"delhiverydata")
    return {
      awbNumber: order.awb,
      courier: 'Delhivery',
      status: trackingData.ShipmentData[0].Status?.Instructions,
      from: order.pickupLocation || 'Not specified',
      to: order.deliveryLocation || 'Not specified',
      estimatedDelivery: trackingData.expectedDeliveryDate || 'Pending',
      currentStatus: trackingData.ShipmentData[0].Status?.Instructions || 'Unknown',
      trackingHistory: formatDelhiveryHistory(trackingData),
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
  
  return history.map(event => ({
    status: event.state.replaceAll("_"," "),
    location: event.location || 'Unknown',
    timestamp: event.timestamp || event.date,
    description: event.description || event.remarks || `${event.status} at ${event.location}`,
    completed: event.status === 'DELIVERED' || event.completed || true
  }));
}

function formatEkartHistory(history) {
  if (!history || !Array.isArray(history)) return [];
  
  return history.map(event => ({
    status: formatEkartStatus(event.status),
    location: event.location || 'Unknown',
    timestamp: event.timestamp || event.date,
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

  if (!shipment || !Array.isArray(shipment.Scans)) {
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

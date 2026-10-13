const { User,OrderItem,Warehouse  } = require('../models');
const axios = require('axios');
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const { Op,fn, col, literal } = require("sequelize");
const { generateUniqueReferenceId, resolveUniqueReferenceId } = require('../utils/orderReference');



















exports.updateSeller = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const seller = await User.findByPk(id);

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Seller not found'
      });
    }
    await seller.update(updateData);

    return res.status(200).json({
      success: true,
      message: 'Seller updated successfully',
      data: seller
    });

  } catch (error) {
    console.error('Update Seller Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal Server Error'
    });
  }
};

const asLabelBool = (value, fallback) => {
  if (value === true || value === 1 || value === '1' || value === 'true') return true;
  if (value === false || value === 0 || value === '0' || value === 'false') return false;
  return fallback;
};

const DEFAULT_LABEL_SETTINGS = {
  template: 'default',
  companyName: '',
  logoUrl: '',
  supportPhone: '',
  gstOnLabel: '',
  footerText: '',
  showWarehouseAddress: true,
  showCompanyName: true,
  showLogo: true,
  showSupportPhone: true,
  showGst: false,
  showTotal: true,
  showOrderBarcode: true,
  showAwbBarcode: true,
  showAwbQr: true,
  showHsnTax: false,
  showDisclaimer: true,
  showSku: true,
  showWeight: false,
  showDimensions: false,
  showOrderReferenceId: false,
  showOrderNo: false,
};

exports.getLabelSettings = async (req, res) => {
  try {
    const { id } = req.params;
    const seller = await User.findByPk(id, {
      attributes: ['id', 'name', 'company', 'phone', 'gst', 'labelSettings'],
    });
    if (!seller) {
      return res.status(404).json({ success: false, message: 'Seller not found' });
    }
    const saved = seller.labelSettings && typeof seller.labelSettings === 'object'
      ? seller.labelSettings
      : {};
    return res.json({
      success: true,
      data: {
        sellerId: seller.id,
        sellerName: seller.name,
        company: seller.company,
        settings: {
          ...DEFAULT_LABEL_SETTINGS,
          companyName: saved.companyName || seller.company || '',
          supportPhone: saved.supportPhone || seller.phone || '',
          gstOnLabel: saved.gstOnLabel || (seller.gst && seller.gst !== '-' ? seller.gst : ''),
          ...saved,
        },
      },
    });
  } catch (error) {
    console.error('Get Label Settings Error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.updateLabelSettings = async (req, res) => {
  try {
    const { id } = req.params;
    const incoming = req.body?.settings || req.body || {};
    const seller = await User.findByPk(id);
    if (!seller) {
      return res.status(404).json({ success: false, message: 'Seller not found' });
    }

    const merged = {
      ...DEFAULT_LABEL_SETTINGS,
      ...(seller.labelSettings || {}),
      ...incoming,
    };

    // Normalize booleans / strings
    const settings = {
      template: ['default', 'compact', 'detailed', 'with_tax'].includes(merged.template)
        ? merged.template
        : 'default',
      companyName: String(merged.companyName || '').trim(),
      logoUrl: String(merged.logoUrl || '').trim(),
      supportPhone: String(merged.supportPhone || '').trim(),
      gstOnLabel: String(merged.gstOnLabel || '').trim(),
      footerText: String(merged.footerText || '').trim(),
      showWarehouseAddress: asLabelBool(merged.showWarehouseAddress, true),
      showCompanyName: asLabelBool(merged.showCompanyName, true),
      showLogo: asLabelBool(merged.showLogo, true),
      showSupportPhone: asLabelBool(merged.showSupportPhone, true),
      showGst: asLabelBool(merged.showGst, false),
      showTotal: asLabelBool(merged.showTotal, true),
      showOrderBarcode: asLabelBool(merged.showOrderBarcode, true),
      showAwbBarcode: asLabelBool(merged.showAwbBarcode, true),
      showAwbQr: asLabelBool(merged.showAwbQr, true),
      showHsnTax: asLabelBool(merged.showHsnTax, false),
      showSku: asLabelBool(merged.showSku, true),
      showDisclaimer: asLabelBool(merged.showDisclaimer, true),
      showWeight: asLabelBool(merged.showWeight, false),
      showDimensions: asLabelBool(merged.showDimensions, false),
      showOrderReferenceId: asLabelBool(merged.showOrderReferenceId, false),
      showOrderNo: asLabelBool(merged.showOrderNo, false),
    };

    await seller.update({ labelSettings: settings });

    return res.json({
      success: true,
      message: 'Label settings saved',
      data: { sellerId: seller.id, settings },
    });
  } catch (error) {
    console.error('Update Label Settings Error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};




exports.getEkartToken = async () => {
  try {
    const response = await axios.post(
      process.env.EKART_URL,
      {
        username: process.env.EKART_USERNAME,
        password: process.env.EKART_PASSWORD
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;

  } catch (error) {
    console.error('Ekart API Error:', error.response?.data || error.message);
    throw error;
  }
};







const Order = require('../models/Order');
const Shipment = require('../models/Shipment');
const Wallet = require('../models/Wallet');


exports.getDashboardData = async (req, res) => {
  try {
    const { user_id, role } = req.query;
    const roleName = String(role || '').toLowerCase();
    let isAdmin =
      !user_id ||
      parseInt(user_id, 10) === 1 ||
      roleName === 'admin' ||
      roleName === 'super admin';

    // Resolve admin from DB when role not passed from client
    if (!isAdmin && user_id) {
      try {
        const requester = await User.findByPk(user_id, {
          attributes: ['id'],
          include: [{ association: 'role', attributes: ['name'], required: false }],
        });
        const dbRole = String(requester?.role?.name || '').toLowerCase();
        isAdmin = dbRole === 'admin' || dbRole === 'super admin';
      } catch (_) {
        /* ignore */
      }
    }

    // Sellers: match both user_id and seller (orders store either/both)
    const sellerScope = user_id && !isAdmin
      ? {
          [Op.or]: [
            { user_id: user_id },
            { user_id: parseInt(user_id, 10) || user_id },
            { seller: String(user_id) },
            { seller: user_id },
          ],
        }
      : {};

    const baseWhereConditions = { ...sellerScope };

    const walletWhere = user_id && !isAdmin ? { user_id: user_id } : {};

    const courierWhere = {
      ...baseWhereConditions,
      [Op.and]: [
        { courier: { [Op.ne]: null } },
        { courier: { [Op.ne]: '-' } },
        { courier: { [Op.ne]: '' } },
      ],
    };

    const [
      allOrdersForBuckets,
      courierPerformance,
      recentOrdersRaw,
      totalOrders,
      rtoOrders,
      walletRows,
    ] = await Promise.all([
      Order.findAll({
        attributes: ['id', 'status', 'awb', 'courier', 'orderNumber', 'customerName', 'amount', 'financialStatus', 'createdAt'],
        where: baseWhereConditions,
        raw: true,
      }),

      Order.findAll({
        attributes: [
          'courier',
          [
            literal(`ROUND(
              SUM(CASE WHEN status = 'Delivered' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0),
              2
            )`),
            'delivered'
          ],
          [
            literal(`ROUND(
              SUM(CASE WHEN status IN ('RTO', 'RTO In transit', 'RTO INITIATED', 'UNDELIVERED', 'RTO Delivered', 'Cancelled') THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0),
              2
            )`),
            'rto'
          ],
          [fn('COUNT', col('id')), 'total_orders']
        ],
        where: courierWhere,
        group: ['courier'],
        raw: true
      }),

      Order.findAll({
        limit: 8,
        order: [['createdAt', 'DESC'], ['id', 'DESC']],
        attributes: [
          'id',
          'orderNumber',
          'createdAt',
          'customerName',
          'status',
          'courier',
          'amount',
          'financialStatus',
        ],
        where: baseWhereConditions,
        raw: true
      }),

      Order.count({ where: baseWhereConditions }),

      Order.count({
        where: {
          ...baseWhereConditions,
          [Op.or]: [
            { status: { [Op.iLike]: '%RTO%' } },
            { status: { [Op.iLike]: '%UNDELIVERED%' } },
            { status: 'Cancelled' },
            { status: 'Canceled' },
          ],
        },
      }),

      Wallet.findAll({
        where: walletWhere,
        order: [['createdAt', 'DESC']],
        limit: 10,
        raw: true,
      }),
    ]);

    const hasAwb = (o) => o.awb && o.awb !== '-' && o.awb !== '' && o.awb !== '—';
    const statusBuckets = {
      newOrders: 0,
      courierAssigned: 0,
      inTransit: 0,
      delivered: 0,
      undelivered: 0,
      rto: 0,
    };

    const laterJourney = [
      'picked up', 'pickup complete', 'in transit', 'out for delivery', 'delivered',
      'undelivered', 'rto', 'cancelled', 'canceled',
    ];
    const isPrePickupStatus = (s) => (
      s.includes('ready for dispatch') ||
      s.includes('ready to ship') ||
      s.includes('courier assigned') ||
      s.includes('label created') ||
      s.includes('manifest') ||
      s.includes('pickup scheduled') ||
      s.includes('out for pickup') ||
      s.includes('pickups') ||
      s.includes('shipment expected') ||
      s === 'shipped' ||
      s.includes('booked') ||
      s.includes('assigned')
    );

    for (const o of allOrdersForBuckets) {
      const s = String(o.status || '').toLowerCase();
      if (s === 'delivered') {
        statusBuckets.delivered += 1;
      } else if (s.includes('undelivered') || s.includes('ndr')) {
        statusBuckets.undelivered += 1;
      } else if (s.includes('rto') || s.includes('return')) {
        statusBuckets.rto += 1;
      } else if (hasAwb(o) && isPrePickupStatus(s)) {
        statusBuckets.courierAssigned += 1;
      } else if (
        s === 'in transit' ||
        s.includes('out for delivery') ||
        s.includes('picked up') ||
        s.includes('pickup complete')
      ) {
        // True forward journey only — pickup/manifest stages stay in Courier Assigned.
        statusBuckets.inTransit += 1;
      } else if (hasAwb(o) && !laterJourney.some((x) => s.includes(x))) {
        statusBuckets.courierAssigned += 1;
      } else if (s === 'pending' || s.includes('new') || s.includes('processing') || !hasAwb(o)) {
        statusBuckets.newOrders += 1;
      } else if (hasAwb(o)) {
        statusBuckets.courierAssigned += 1;
      } else {
        statusBuckets.newOrders += 1;
      }
    }

    const shipmentAnalytics = [
      { name: 'Delivered', value: statusBuckets.delivered, fill: '#34d399' },
      { name: 'In Transit', value: statusBuckets.inTransit, fill: '#60a5fa' },
      { name: 'RTO', value: statusBuckets.rto, fill: '#f87171' },
      { name: 'Undelivered', value: statusBuckets.undelivered, fill: '#fb7185' },
      { name: 'New', value: statusBuckets.newOrders, fill: '#2dd4bf' },
    ].filter((x) => x.value > 0);

    const walletTransactions = walletRows.map((tx) => {
      const isCredit = String(tx.status || '').toLowerCase() === 'credit';
      const amt = Math.abs(parseFloat(tx.amount) || 0);
      return {
        id: tx.id,
        title: tx.description || tx.referenceId || tx.transid || (isCredit ? 'Wallet credit' : 'Wallet debit'),
        date: tx.createdAt
          ? new Date(tx.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          : '',
        amount: `${isCredit ? '+' : '-'}₹${amt.toLocaleString('en-IN')}`,
        isCredit,
      };
    });

    const recentOrders = recentOrdersRaw.map((item) => {
      const st = String(item.status || '').toLowerCase();
      const isReverse = st.includes('rto') || st.includes('undelivered') || st.includes('return');
      return {
        id: item.orderNumber || '-',
        orderNumber: item.orderNumber || '-',
        createdAt: item.createdAt || null,
        customer: item.customerName || '-',
        product: item.courier && item.courier !== '-' ? item.courier : 'Manual',
        type: isReverse ? 'Reverse' : 'Forward',
        status: item.status || 'Pending',
        courier: item.courier === '-' ? '-' : (item.courier || '-'),
        amount: item.amount || '₹0',
      };
    });

    const totalOrdersCount = totalOrders;
    const rtoOrdersCount = rtoOrders;
    const rtoRate = totalOrdersCount ? (rtoOrdersCount / totalOrdersCount) * 100 : 0;

    const riskAlerts = [];
    if (rtoRate > 15) {
      riskAlerts.push({
        type: 'High RTO',
        message: `RTO rate exceeded ${rtoRate.toFixed(2)}%`,
        severity: 'high',
      });
    }

    const parsedCourierPerformance = courierPerformance.map((item) => ({
      name: item.courier,
      delivered: parseFloat(item.delivered) || 0,
      rto: parseFloat(item.rto) || 0,
      total_orders: parseInt(item.total_orders) || 0,
    }));

    const orderStatusData = [
      { name: 'Delivered', value: statusBuckets.delivered, color: 'hsl(142, 76%, 36%)' },
      { name: 'In Transit', value: statusBuckets.inTransit, color: 'hsl(199, 89%, 48%)' },
      { name: 'Pending', value: statusBuckets.newOrders + statusBuckets.courierAssigned, color: 'hsl(38, 92%, 50%)' },
      { name: 'RTO / Cancelled', value: statusBuckets.rto + statusBuckets.undelivered, color: 'hsl(0, 72%, 51%)' },
    ].filter((g) => g.value > 0);

    return res.json({
      success: true,
      data: {
        statusBuckets,
        walletTransactions,
        shipmentAnalytics,
        recentOrders,
        courierPerformance: parsedCourierPerformance,
        orderStatusData,
        riskAlerts,
        summary: {
          totalOrders: totalOrdersCount,
          rtoOrders: rtoOrdersCount,
          rtoRate: parseFloat(rtoRate.toFixed(2)),
        },
      },
      meta: {
        user_id: user_id || null,
        isAdmin,
      },
    });

  } catch (error) {
    console.error("Dashboard Error:", error);
    console.error("Error details:", error.original || error);

    res.status(500).json({
      success: false,
      message: "Dashboard API failed",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};



exports.getReportData = async (req, res) => {
  try {
    // Get user_id from params, query, or body
    let userId = null;
    
    if (req.params.user_id) {
      userId = parseInt(req.params.user_id);
    } else if (req.query.user_id) {
      userId = parseInt(req.query.user_id);
    } else if (req.body.user_id) {
      userId = parseInt(req.body.user_id);
    }
    
    // Build base where conditions
    const baseWhereConditions = {
      orderDate: { [Op.ne]: null },
      amount: { [Op.ne]: null }
    };
    
    // Apply user filter for non-admin users
    if (userId && userId !== 1) {
      baseWhereConditions.user_id = userId;
    }
    
    const [
      revenueData,
      courierReportData,
      sellerReportData,
      rtoTrendData,
      totalStats
    ] = await Promise.all([
      // Revenue data by month
      Order.findAll({
        attributes: [
          [fn('TO_CHAR', col('orderDate'), 'Mon'), 'month'],
          [fn('TO_CHAR', col('orderDate'), 'MM'), 'month_num'],
          [literal(`SUM(REPLACE(REPLACE(amount, '₹', ''), ',', '')::NUMERIC)`), 'revenue'],
          [fn('COUNT', col('id')), 'orders']
        ],
        where: {
          ...baseWhereConditions,
          orderDate: {
            [Op.gte]: literal("DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months'")
          }
        },
        group: [fn('TO_CHAR', col('orderDate'), 'Mon'), fn('TO_CHAR', col('orderDate'), 'MM')],
        order: [[fn('MIN', col('orderDate')), 'ASC']],
        raw: true
      }),

      // Courier report data - LOWERED THRESHOLD from 50 to 5
      Order.findAll({
        attributes: [
          'courier',
          [fn('COUNT', col('id')), 'shipments'],
          [literal(`SUM(CASE WHEN status = 'Delivered' THEN 1 ELSE 0 END)`), 'delivered'],
          [literal(`SUM(CASE WHEN status = 'RTO' THEN 1 ELSE 0 END)`), 'rto'],
          [literal(`ROUND(AVG(CASE WHEN status = 'Delivered' AND "processedAt" IS NOT NULL AND "orderDate" IS NOT NULL 
                   THEN EXTRACT(DAY FROM ("processedAt" - "orderDate")) 
                   ELSE NULL END), 1)`), 'avgDays']
        ],
        where: {
          ...baseWhereConditions,
          courier: { [Op.ne]: '-', [Op.ne]: null, [Op.not]: '' }
        },
        group: ['courier'],
        having: literal('COUNT(*) > 5'), // Changed from 50 to 5 for smaller datasets
        order: [[literal('shipments'), 'DESC']],
        raw: true
      }),

      // Seller report data - LOWERED THRESHOLD from 10 to 3
      Order.findAll({
        attributes: [
          'seller',
          [fn('COUNT', col('id')), 'orders'],
          [literal(`SUM(REPLACE(REPLACE(amount, '₹', ''), ',', '')::NUMERIC)`), 'revenue'],
          [literal(`ROUND(SUM(CASE WHEN status = 'RTO' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 1)`), 'rtoRate'],
          [literal(`ROUND(100 - COALESCE(SUM(CASE WHEN status = 'RTO' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 0), 0)`), 'score']
        ],
        where: {
          ...baseWhereConditions,
          seller: { [Op.ne]: null, [Op.not]: '' }
        },
        group: ['seller'],
        having: literal('COUNT(*) > 3'), // Changed from 10 to 3
        order: [[literal('orders'), 'DESC']],
        limit: 10,
        raw: true
      }),

      // RTO trend by month
      Order.findAll({
        attributes: [
          [fn('TO_CHAR', col('orderDate'), 'Mon'), 'month'],
          [fn('TO_CHAR', col('orderDate'), 'MM'), 'month_num'],
          [literal(`ROUND(COALESCE(SUM(CASE WHEN status = 'RTO' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 0), 1)`), 'rtoRate']
        ],
        where: {
          ...baseWhereConditions,
          orderDate: {
            [Op.gte]: literal("DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months'")
          }
        },
        group: [fn('TO_CHAR', col('orderDate'), 'Mon'), fn('TO_CHAR', col('orderDate'), 'MM')],
        order: [[fn('MIN', col('orderDate')), 'ASC']],
        raw: true
      }),

      // Total statistics
      Order.findAll({
        attributes: [
          [literal(`COALESCE(SUM(REPLACE(REPLACE(amount, '₹', ''), ',', '')::NUMERIC), 0)`), 'totalRevenue'],
          [fn('COUNT', col('id')), 'totalOrders'],
          [literal(`COUNT(CASE WHEN courier IS NOT NULL AND courier != '-' AND courier != '' THEN 1 END)`), 'totalShipments'],
          [literal(`COUNT(CASE WHEN status = 'Delivered' THEN 1 END)`), 'totalDelivered'],
          [literal(`COUNT(CASE WHEN status = 'RTO' THEN 1 END)`), 'totalRTO'],
          [literal(`ROUND(AVG(CASE WHEN status = 'Delivered' AND "processedAt" IS NOT NULL AND "orderDate" IS NOT NULL 
                   THEN EXTRACT(DAY FROM ("processedAt" - "orderDate")) 
                   ELSE NULL END), 1)`), 'avgDeliveryDays']
        ],
        where: baseWhereConditions,
        raw: true
      })
    ]);

    // Format revenue data
    const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedRevenueData = revenueData
      .map(item => ({
        month: item.month,
        revenue: parseFloat(item.revenue) || 0,
        orders: parseInt(item.orders) || 0
      }))
      .sort((a, b) => monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month));

    // Format courier report data - ensure it always returns an array
    const formattedCourierReportData = (courierReportData || []).map(item => ({
      courier: item.courier || 'Unknown',
      shipments: parseInt(item.shipments) || 0,
      delivered: parseInt(item.delivered) || 0,
      rto: parseInt(item.rto) || 0,
      avgDays: parseFloat(item.avgDays) || 0,
      deliveryRate: item.shipments > 0 ? ((item.delivered / item.shipments) * 100).toFixed(1) : 0,
      rtoRate: item.shipments > 0 ? ((item.rto / item.shipments) * 100).toFixed(1) : 0
    }));

    // Format seller report data
    const formattedSellerReportData = (sellerReportData || []).map(item => {
      const revenueValue = parseFloat(item.revenue) || 0;
      let formattedRevenue = '';
      if (revenueValue >= 100000) {
        formattedRevenue = `₹${(revenueValue / 100000).toFixed(1)}L`;
      } else if (revenueValue >= 1000) {
        formattedRevenue = `₹${(revenueValue / 1000).toFixed(1)}K`;
      } else {
        formattedRevenue = `₹${revenueValue}`;
      }
      
      return {
        seller: item.seller,
        orders: parseInt(item.orders) || 0,
        revenue: formattedRevenue,
        revenueValue: revenueValue, // Keep raw value for calculations
        rtoRate: parseFloat(item.rtoRate) || 0,
        score: parseFloat(item.score) || 0
      };
    });

    // Format RTO trend data
    const formattedRtoTrendData = (rtoTrendData || [])
      .map(item => ({
        month: item.month,
        rtoRate: parseFloat(item.rtoRate) || 0
      }))
      .sort((a, b) => monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month));

    // Calculate summary statistics
    const summary = {
      totalRevenue: parseFloat(totalStats[0]?.totalRevenue) || 0,
      totalOrders: parseInt(totalStats[0]?.totalOrders) || 0,
      totalShipments: parseInt(totalStats[0]?.totalShipments) || 0,
      totalDelivered: parseInt(totalStats[0]?.totalDelivered) || 0,
      totalRTO: parseInt(totalStats[0]?.totalRTO) || 0,
      overallRTORate: totalStats[0]?.totalShipments > 0 
        ? parseFloat((totalStats[0].totalRTO / totalStats[0].totalShipments * 100).toFixed(2))
        : 0,
      avgDeliveryDays: parseFloat(totalStats[0]?.avgDeliveryDays) || 0
    };

    // Generate risk alerts
    const riskAlerts = [];

    // High RTO sellers
    const highRTOSellers = formattedSellerReportData.filter(seller => seller.rtoRate > 10);
    highRTOSellers.forEach(seller => {
      riskAlerts.push({
        type: "High Seller RTO",
        message: `${seller.seller} has high RTO rate: ${seller.rtoRate}%`,
        severity: seller.rtoRate > 15 ? "high" : "medium",
        seller: seller.seller,
        rtoRate: seller.rtoRate
      });
    });

    // Low performing couriers
    const lowPerformingCouriers = formattedCourierReportData.filter(courier => 
      courier.rto > 0 && courier.rtoRate > 10
    );
    lowPerformingCouriers.forEach(courier => {
      riskAlerts.push({
        type: "Courier Performance",
        message: `${courier.courier} has high RTO rate: ${courier.rtoRate}%`,
        severity: courier.rtoRate > 12 ? "high" : "medium",
        courier: courier.courier,
        rtoRate: courier.rtoRate
      });
    });

    // Overall RTO alert
    if (summary.overallRTORate > 8) {
      riskAlerts.push({
        type: "Overall RTO",
        message: `Overall RTO rate is ${summary.overallRTORate}%, above threshold`,
        severity: summary.overallRTORate > 10 ? "high" : "medium",
        rtoRate: summary.overallRTORate
      });
    }

    // No data alerts
    if (formattedCourierReportData.length === 0) {
      riskAlerts.push({
        type: "Insufficient Data",
        message: "Not enough courier data to generate reports (need minimum 5 shipments per courier)",
        severity: "low"
      });
    }

    if (formattedSellerReportData.length === 0) {
      riskAlerts.push({
        type: "Insufficient Data",
        message: "Not enough seller data to generate reports (need minimum 3 orders per seller)",
        severity: "low"
      });
    }

    // Prepare response based on user access
    let responseData = {};

    if (userId === 1) {
      // Admin user - full access
      responseData = {
        revenueData: formattedRevenueData,
        courierReportData: formattedCourierReportData,
        sellerReportData: formattedSellerReportData,
        rtoTrendData: formattedRtoTrendData,
        riskAlerts,
        summary
      };
    } else if (userId) {
      // Regular user - limited data
      const userSellerData = formattedSellerReportData.filter(seller => 
        seller.seller.toLowerCase().includes(`user${userId}`)
      );
      
      responseData = {
        revenueData: formattedRevenueData.slice(0, 3),
        courierReportData: formattedCourierReportData.slice(0, 3),
        sellerReportData: userSellerData.length > 0 ? userSellerData : formattedSellerReportData.slice(0, 3),
        rtoTrendData: formattedRtoTrendData.slice(-3),
        riskAlerts: riskAlerts.filter(alert => alert.severity === "high"),
        summary: {
          totalRevenue: summary.totalRevenue,
          totalOrders: summary.totalOrders,
          overallRTORate: summary.overallRTORate
        }
      };
    } else {
      // Public data - limited access
      responseData = {
        revenueData: formattedRevenueData.slice(0, 3),
        courierReportData: formattedCourierReportData.slice(0, 3),
        sellerReportData: formattedSellerReportData.slice(0, 3),
        rtoTrendData: formattedRtoTrendData.slice(-3),
        riskAlerts: riskAlerts.slice(0, 2),
        summary: {
          totalRevenue: summary.totalRevenue,
          totalOrders: summary.totalOrders,
          overallRTORate: summary.overallRTORate
        }
      };
    }

    return res.json({
      success: true,
      data: responseData,
      meta: {
        userId: userId || null,
        isAdmin: userId === 1,
        timestamp: new Date().toISOString(),
        recordCount: {
          revenueMonths: formattedRevenueData.length,
          couriers: formattedCourierReportData.length,
          sellers: formattedSellerReportData.length
        },
        thresholds: {
          minCourierShipments: 5,
          minSellerOrders: 3
        }
      }
    });

  } catch (error) {
    console.error("Dashboard Error:", error);
    console.error("Error details:", error.original || error);
    
    res.status(500).json({
      success: false,
      message: "Dashboard API failed",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};




exports.getUserOrdersWithShipment = async (req, res) => {
  try {
    const { user_id } = req.params;

    const orders = await Order.findAll({
      where: { user_id },
      order: [['createdAt', 'DESC']]
    });

    const referenceId = orders.map(o => o.referenceId);

    const shipments = await Shipment.findAll({
      where: {
        referenceId: referenceId
      },
      attributes: ['referenceId', 'shipmentjson', 'shipmenttracking', 'createdAt']
    });

    const shipmentMap = {};
    shipments.forEach(s => {
      shipmentMap[s.referenceId] = s;
    });

    const result = orders.map(order => {
      const shipment = shipmentMap[order.referenceId];

      return {
        order_id: order.id,
        referenceId: order.referenceId,
        customer: order.customerName,
        amount: order.amount,
        order_status: order.status,
        shipment: shipment
          ? {
              tracking_id: shipment.shipmenttracking?.tracking_id || null,
              vendor: shipment.shipmenttracking?.vendor || null,
              status: shipment.shipmenttracking?.status ? 'Completed' : 'Pending',
              cod_amount: shipment.shipmentjson?.cod_amount || 0,
              payment_mode: shipment.shipmentjson?.payment_mode || null,
              shipment_date: shipment.createdAt
            }
          : null
      };
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};






exports.getCodRemittance = async (req, res) => {
  try {
    const { user_id } = req.params;

    const orders = await Order.findAll({
      where: { user_id }
    });

    const referenceId = orders.map(o => o.referenceId);

    const shipments = await Shipment.findAll({
      where: {
        referenceId: referenceId
      }
    });

    const orderMap = {};
    orders.forEach(o => {
      orderMap[o.referenceId] = o;
    });

    const sellerMap = {};

    shipments.forEach(s => {
      const shipment = s.shipmentjson || {};
      const order = orderMap[s.referenceId];

      if (!order) return;

      if (shipment.financialStatus !== 'paid') return;

      const seller = shipment.seller_name || order.seller || 'Unknown';
      const amount = Number(shipment.cod_amount || 0);

      if (!sellerMap[seller]) {
        sellerMap[seller] = {
          seller,
          totalAmount: 0,
          orders: 0,
          latestDate: null,
          settled: false
        };
      }

      sellerMap[seller].totalAmount += amount;
      sellerMap[seller].orders += 1;

      if (
        !sellerMap[seller].latestDate ||
        new Date(s.createdAt) > new Date(sellerMap[seller].latestDate)
      ) {
        sellerMap[seller].latestDate = s.createdAt;
      }
    });

    const result = Object.values(sellerMap).map(item => {
      const dueDate = new Date(item.latestDate);
      dueDate.setDate(dueDate.getDate() + 3);

      let status = 'Pending';

      if (item.settled) {
        status = 'Settled';
      } else if (new Date() > dueDate) {
        status = 'Overdue';
      }

      return {
        seller: item.seller,
        amount: `₹${item.totalAmount}`,
        orders: item.orders,
        due_date: dueDate,
        status
      };
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};






exports.innofulfil_tracking_api = async (req, res) => {
  try {
    const { orderId } = req.body;
    const innofulfillService = require('../services/innofulfillService');
    const trackingRes = await innofulfillService.trackByAwb(orderId);

    if (!trackingRes.success) {
      return res.status(500).json({
        success: false,
        error: trackingRes.error || 'Tracking failed'
      });
    }

    return res.json({
      success: true,
      data: trackingRes.data
    });

  } catch (error) {
    console.error("ERROR:", error.response?.data || error.message);

    return res.status(500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
};




exports.ekart_tracking_api = async (req, res) => {
  try {
    const { orderId } = req.body;
    const tokenData = await getekarttoken();
    const token =
      tokenData?.access_token ||
      tokenData?.data?.access_token ||
      tokenData?.token;

    console.log("EKART TOKEN:", token);

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Ekart token not received"
      });
    }
    const trackingRes = await axios.get(
      //`https://app.elite.ekartlogistics.in/integrations/v1/shipments/${orderId}/tracking`,
`https://app.elite.ekartlogistics.in/data/v1/elite/track/${orderId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
console.log(trackingRes)
    return res.json({
      success: true,
      data: trackingRes.data
    });

  } catch (error) {
    console.error("EKART ERROR:", error.response?.data || error.message);

    return res.status(500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
};


async function getekarttoken() {
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



const calculateVolumetricWeight = (length, width, height) => {
  if (!length || !width || !height) return 0;
  // Volumetric weight = (L × W × H) / 5000 (standard courier calculation)
  return (length * width * height) / 5000;
};

// Helper function to calculate total price with GST
const calculateTotalPrice = (unitPrice, quantity, gstRate) => {
  const subtotal = unitPrice * quantity;
  const gstAmount = subtotal * (gstRate / 100);
  return subtotal + gstAmount;
};




// Manual Create Order
exports.manualcreateOrder = async (req, res) => {
  try {
    // Handle both formats: direct object or { data: [...] }
    let ordersData = [];
    
    if (req.body.data && Array.isArray(req.body.data)) {
      // Format: { data: [...], user_id: 1 }
      ordersData = req.body.data;
      req.user_id = req.body.user_id;
    } else if (Array.isArray(req.body)) {
      // Format: direct array
      ordersData = req.body;
    } else if (req.body.orderNumber || req.body.items) {
      // Format: single order object
      ordersData = [req.body];
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid request format. Expected { data: [...] } or order object'
      });
    }
    
    if (ordersData.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No orders data found'
      });
    }
    
    const createdOrders = [];
    const failedOrders = [];
    
    // Process each order
    for (const orderData of ordersData) {
      try {
        // Validate required fields for each order
        if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
          failedOrders.push({
            order: orderData,
            error: 'Order must contain at least one item'
          });
          continue;
        }
        
        // Calculate total items and weights
        let totalItems = 0;
        let totalDeadWeight = 0;
        let totalVolumetricWeight = 0;
        
        // Process items with calculations
        const processedItems = orderData.items.map(item => {
          // Use provided volumetricWeight or calculate it
          let volumetricWeight = item.volumetricWeight;
          if (!volumetricWeight && (item.length || item.width || item.height)) {
            volumetricWeight = calculateVolumetricWeight(
              item.length || 0,
              item.width || 0,
              item.height || 0
            );
          } else if (!volumetricWeight) {
            volumetricWeight = 0;
          }
          
          // Calculate total price if not provided
          let totalPrice = item.totalPrice;
          if (!totalPrice && item.unitPrice && item.quantity) {
            totalPrice = calculateTotalPrice(
              item.unitPrice,
              item.quantity,
              item.gstRate || 0
            );
          }
          
          totalItems += item.quantity || 0;
          totalDeadWeight += (item.deadWeight || 0) * (item.quantity || 0);
          totalVolumetricWeight += volumetricWeight * (item.quantity || 0);
          
          return {
            ...item,
            volumetricWeight,
            totalPrice: totalPrice || 0
          };
        });
        
        // Generate order number if not provided
        let orderNumber = orderData.orderNumber;
        if (!orderNumber) {
          const date = new Date();
          const timestamp = date.getTime().toString().slice(-8);
          orderNumber = `ORD-${timestamp}-${Math.floor(Math.random() * 1000)}`;
        }
        
        const nextReferenceId = await resolveUniqueReferenceId(orderData.referenceId);

        const resolvedUserId = req.user_id || orderData.user_id || null;
        let resolvedWarehouseId = orderData.warehouse || null;
        if (!resolvedWarehouseId && resolvedUserId) {
          const defaultWarehouse = await Warehouse.findOne({
            where: {
              user_id: resolvedUserId,
              isActive: true,
            },
            order: [['isDefault', 'DESC'], ['id', 'ASC']],
          });
          resolvedWarehouseId = defaultWarehouse?.id || null;
        }

        // Prepare order data
        const orderPayload = {
          id: orderData.id || uuidv4(),
          user_id: resolvedUserId,
          orderNumber: orderNumber,
          referenceId: nextReferenceId,
          customerName: orderData.customerName || null,
          customerPhone: orderData.customerPhone || null,
          customerEmail: orderData.customerEmail || null,
          seller: orderData.seller ? String(orderData.seller) : null,
          courier: orderData.courier || '-',
          status: orderData.status || 'Pending',
          amount: orderData.amount || null,
          orderDate: orderData.orderDate || new Date().toISOString().split('T')[0],
          awb: orderData.awb || '-',
          platform: orderData.platform || 'Manual',
          pincode: orderData.pincode || null,
          city: orderData.city || null,
          state: orderData.state || null,
          addressLine1: orderData.addressLine1 || null,
          addressLine2: orderData.addressLine2 || '',
          landmark: orderData.landmark || '',
          totalItems: totalItems,
          totalWeight: totalDeadWeight,
          totalVolumetricWeight: totalVolumetricWeight,
          shopifyOrderId: orderData.shopifyOrderId || null,
          financialStatus: orderData.financialStatus || 'paid',
          fulfillmentStatus: orderData.fulfillmentStatus || null,
          paymentGateway: orderData.paymentGateway || 'Prepaid',
          subtotalPrice: orderData.subtotalPrice || null,
          totalTax: orderData.totalTax || 0,
          totalDiscounts: orderData.totalDiscounts || 0,
          totalShippingPrice: orderData.totalShippingPrice || 0,
          totalOutstanding: orderData.totalOutstanding || 0,
          currency: orderData.currency || 'INR',
          taxesIncluded: orderData.taxesIncluded || false,
          taxExempt: orderData.taxExempt || false,
          confirmationNumber: orderData.confirmationNumber || null,
          checkoutId: orderData.checkoutId || null,
          checkoutToken: orderData.checkoutToken || null,
          orderStatusUrl: orderData.orderStatusUrl || null,
          sourceName: orderData.sourceName || null,
          browserIp: orderData.browserIp || null,
          userAgent: orderData.userAgent || null,
          shippingAddress: orderData.shippingAddress || null,
          billingAddress: orderData.billingAddress || null,
          customerData: orderData.customerData || null,
          processedAt: orderData.processedAt || null,
          cancelledAt: orderData.cancelledAt || null,
          cancelReason: orderData.cancelReason || null,
          warehouse: resolvedWarehouseId,
          trackingnumber: orderData.trackingnumber || null
        };
        
        // Create order in database
        const order = await Order.create(orderPayload);
        
        // Create order items
        const orderItems = await Promise.all(
          processedItems.map(item => 
            OrderItem.create({
              id: uuidv4(),
              orderId: order.id,
              name: item.name,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              gstRate: item.gstRate || 0,
              totalPrice: item.totalPrice,
              height: item.height || 0,
              width: item.width || 0,
              length: item.length || 0,
              deadWeight: item.deadWeight || 0,
              volumetricWeight: item.volumetricWeight || 0
            })
          )
        );
        
        // Fetch complete order with items
        const completeOrder = await Order.findByPk(order.id, {
          include: [{
            model: OrderItem,
            as: 'items'
          }]
        });
        
        createdOrders.push(completeOrder);
        
      } catch (error) {
        console.error('Error processing order:', error);
        failedOrders.push({
          order: orderData,
          error: error.message
        });
      }
    }
    
    // Return response
    if (createdOrders.length === 0 && failedOrders.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'All orders failed to create',
        failedOrders: failedOrders
      });
    }
    
    if (createdOrders.length > 0 && failedOrders.length > 0) {
      return res.status(207).json({
        success: true,
        message: `${createdOrders.length} orders created successfully, ${failedOrders.length} failed`,
        data: createdOrders,
        failedOrders: failedOrders
      });
    }
    
    // If only one order was created, return single object
    if (createdOrders.length === 1) {
      return res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: createdOrders[0]
      });
    }
    
    // Multiple orders created
    return res.status(201).json({
      success: true,
      message: `${createdOrders.length} orders created successfully`,
      data: createdOrders
    });
    
  } catch (error) {
    console.error('Error creating order:', error);
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        success: false,
        message: 'Order number already exists',
        error: error.message
      });
    }
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors.map(e => ({
          field: e.path,
          message: e.message
        }))
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

exports.mergecreateOrder = async (req, res) => {
  try {
    // Handle both formats: direct object or { data: [...] }
    let ordersData = [];
    
    if (req.body.data && Array.isArray(req.body.data)) {
      // Format: { data: [...], user_id: 1 }
      ordersData = req.body.data;
      req.user_id = req.body.user_id;
    } else if (Array.isArray(req.body)) {
      // Format: direct array
      ordersData = req.body;
    } else if (req.body.orderNumber || req.body.items) {
      // Format: single order object
      ordersData = [req.body];
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid request format. Expected { data: [...] } or order object'
      });
    }
    
    if (ordersData.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No orders data found'
      });
    }
    
    const createdOrders = [];
    const failedOrders = [];
    
    // Process each order
    for (const orderData of ordersData) {
      try {
        // Validate required fields for each order
        if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
          failedOrders.push({
            order: orderData,
            error: 'Order must contain at least one item'
          });
          continue;
        }
        
        // Calculate total items and weights
        let totalItems = 0;
        let totalDeadWeight = 0;
        let totalVolumetricWeight = 0;
        
        // Process items with calculations
        const processedItems = orderData.items.map(item => {
          // Use provided volumetricWeight or calculate it
          let volumetricWeight = item.volumetricWeight;
          if (!volumetricWeight && (item.length || item.width || item.height)) {
            volumetricWeight = calculateVolumetricWeight(
              item.length || 0,
              item.width || 0,
              item.height || 0
            );
          } else if (!volumetricWeight) {
            volumetricWeight = 0;
          }
          
          // Calculate total price if not provided
          let totalPrice = item.totalPrice;
          if (!totalPrice && item.unitPrice && item.quantity) {
            totalPrice = calculateTotalPrice(
              item.unitPrice,
              item.quantity,
              item.gstRate || 0
            );
          }
          
          totalItems += item.quantity || 0;
          totalDeadWeight += (item.deadWeight || 0) * (item.quantity || 0);
          totalVolumetricWeight += volumetricWeight * (item.quantity || 0);
          
          return {
            ...item,
            volumetricWeight,
            totalPrice: totalPrice || 0
          };
        });
        
        // Generate order number if not provided
        let orderNumber = orderData.orderNumber;
        if (!orderNumber) {
          const date = new Date();
          const timestamp = date.getTime().toString().slice(-8);
          orderNumber = `ORD-${timestamp}-${Math.floor(Math.random() * 1000)}`;
        }
        
        const nextReferenceId = await resolveUniqueReferenceId(orderData.referenceId);

        const resolvedUserId = req.user_id || orderData.user_id || null;
        let resolvedWarehouseId = orderData.warehouse || null;
        if (!resolvedWarehouseId && resolvedUserId) {
          const defaultWarehouse = await Warehouse.findOne({
            where: {
              user_id: resolvedUserId,
              isActive: true,
            },
            order: [['isDefault', 'DESC'], ['id', 'ASC']],
          });
          resolvedWarehouseId = defaultWarehouse?.id || null;
        }

        // Prepare order data
        const orderPayload = {
          id: orderData.id || uuidv4(),
          user_id: resolvedUserId,
          orderNumber: orderNumber,
          referenceId: nextReferenceId,
          customerName: orderData.customerName || null,
          customerPhone: orderData.customerPhone || null,
          customerEmail: orderData.customerEmail || null,
          seller: orderData.seller ? String(orderData.seller) : null,
          courier: orderData.courier || '-',
          status: orderData.status || 'Pending',
          amount: orderData.amount || null,
          orderDate: orderData.orderDate || new Date().toISOString().split('T')[0],
          awb: orderData.awb || '-',
          platform: orderData.platform || 'Manual',
          pincode: orderData.pincode || null,
          city: orderData.city || null,
          state: orderData.state || null,
          addressLine1: orderData.addressLine1 || null,
          addressLine2: orderData.addressLine2 || '',
          landmark: orderData.landmark || '',
          totalItems: totalItems,
          totalWeight: totalDeadWeight,
          totalVolumetricWeight: totalVolumetricWeight,
          shopifyOrderId: orderData.shopifyOrderId || null,
          financialStatus: orderData.financialStatus || 'paid',
          fulfillmentStatus: orderData.fulfillmentStatus || null,
          paymentGateway: orderData.paymentGateway || 'Prepaid',
          subtotalPrice: orderData.subtotalPrice || null,
          totalTax: orderData.totalTax || 0,
          totalDiscounts: orderData.totalDiscounts || 0,
          totalShippingPrice: orderData.totalShippingPrice || 0,
          totalOutstanding: orderData.totalOutstanding || 0,
          currency: orderData.currency || 'INR',
          taxesIncluded: orderData.taxesIncluded || false,
          taxExempt: orderData.taxExempt || false,
          confirmationNumber: orderData.confirmationNumber || null,
          checkoutId: orderData.checkoutId || null,
          checkoutToken: orderData.checkoutToken || null,
          orderStatusUrl: orderData.orderStatusUrl || null,
          sourceName: orderData.sourceName || null,
          browserIp: orderData.browserIp || null,
          userAgent: orderData.userAgent || null,
          shippingAddress: orderData.shippingAddress || null,
          billingAddress: orderData.billingAddress || null,
          customerData: orderData.customerData || null,
          processedAt: orderData.processedAt || null,
          cancelledAt: orderData.cancelledAt || null,
          cancelReason: orderData.cancelReason || null,
          trackingnumber: orderData.trackingnumber || null,
          warehouse: resolvedWarehouseId,
          merge_order: orderData.merge_order || null,
          merge_status:"Merged",
          platform:"Merged",
        };
        
        // Create order in database
        const order = await Order.create(orderPayload);
        
        // Create order items
        const orderItems = await Promise.all(
          processedItems.map(item => 
            OrderItem.create({
              id: uuidv4(),
              orderId: order.id,
              name: item.name,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              gstRate: item.gstRate || 0,
              totalPrice: item.totalPrice,
              height: item.height || 0,
              width: item.width || 0,
              length: item.length || 0,
              deadWeight: item.deadWeight || 0,
              volumetricWeight: item.volumetricWeight || 0
            })
          )
        );
        
        // Fetch complete order with items
        const completeOrder = await Order.findByPk(order.id, {
          include: [{
            model: OrderItem,
            as: 'items'
          }]
        });
        
        createdOrders.push(completeOrder);


        await Order.update(
  {
    status:"Draft Merged"
  },
  {
    where: {
      orderNumber: {
        [Op.in]: orderPayload.merge_order
      }
    }
  }

);
        
      } catch (error) {
        console.error('Error processing order:', error);
        failedOrders.push({
          order: orderData,
          error: error.message
        });
      }
    }
    
    // Return response
    if (createdOrders.length === 0 && failedOrders.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'All orders failed to create',
        failedOrders: failedOrders
      });
    }
    
    if (createdOrders.length > 0 && failedOrders.length > 0) {
      return res.status(207).json({
        success: true,
        message: `${createdOrders.length} orders created successfully, ${failedOrders.length} failed`,
        data: createdOrders,
        failedOrders: failedOrders
      });
    }
    
    // If only one order was created, return single object
    if (createdOrders.length === 1) {
      return res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: createdOrders[0]
      });
    }
    
    // Multiple orders created
    return res.status(201).json({
      success: true,
      message: `${createdOrders.length} orders created successfully`,
      data: createdOrders
    });
    
  } catch (error) {
    console.error('Error creating order:', error);
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        success: false,
        message: 'Order number already exists',
        error: error.message
      });
    }
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors.map(e => ({
          field: e.path,
          message: e.message
        }))
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};




exports.createWarehouse = async (req, res) => {
  try {
    const data = await Warehouse.create(req.body);
    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllWarehouses = async (req, res) => {
  try {
    const data = await Warehouse.findAll({
      include: [
        {
          model: User,
          as: 'seller'
        }
      ],
      order: [['id', 'DESC']]
    });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getWarehouseById = async (req, res) => {
  try {
    const { id } = req.params;

    const data = await Warehouse.findByPk(id, {
      include: [
        {
          model: User,
          as: 'seller'
        }
      ]
    });

    if (!data) {
      return res.status(404).json({ success: false, message: 'Warehouse not found' });
    }

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateWarehouse = async (req, res) => {
  try {
    const { id } = req.params;

    const warehouse = await Warehouse.findByPk(id);
    if (!warehouse) {
      return res.status(404).json({ success: false, message: 'Warehouse not found' });
    }

    await warehouse.update(req.body);

    res.json({ success: true, message: 'Updated successfully', data: warehouse });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteWarehouse = async (req, res) => {
  try {
    const { id } = req.params;

    const warehouse = await Warehouse.findByPk(id);
    if (!warehouse) {
      return res.status(404).json({ success: false, message: 'Warehouse not found' });
    }

    await warehouse.destroy();

    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

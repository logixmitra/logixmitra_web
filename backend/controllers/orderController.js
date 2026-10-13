const orderService = require('../services/orderService');
const { validationResult } = require('express-validator');
const { User } = require('../models');
const { canViewAllOrders, isAdminRole } = require('../utils/roles');

class OrderController {


async createOrder(req, res) {
  try {
    console.log(req.body);

    const { data, user_id } = req.body;

    if (!Array.isArray(data)) {
      return res.status(400).json({ error: 'Data must be an array' });
    }

    const createdOrders = [];

    for (const item of data) {
      const orderPayload = {
        ...item,
        order: {
          ...item.order,
          user_id
        }
      };

      const order = await orderService.createOrder(orderPayload);
      createdOrders.push(order);
    }

    res.status(201).json(createdOrders);

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: error.message });
  }
}
/*
  async getAllOrders(req, res) {
    try {
      const filters = {
        status: req.query.status,
        platform: req.query.platform,
        search: req.query.search,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const orders = await orderService.getAllOrders(filters);
      res.json(orders);
    } catch (error) {
      console.error('Get orders error:', error);
      res.status(500).json({ error: error.message });
    }
  }
*/

  async getAllOrders(req, res) {
    try {
      const filters = {
        status: req.query.status,
        platform: req.query.platform,
        search: req.query.search,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        startDateDay: req.query.startDateDay,
        endDateDay: req.query.endDateDay,
        user_id: req.query.user_id,
        courier: req.query.courier,
        financialStatus: req.query.financialStatus,
        awb: req.query.awb,
        direction: req.query.direction,
        dateType: req.query.dateType,
        page: req.query.page,
        limit: req.query.limit,
        paginate: req.query.paginate,
        orderType: req.query.orderType,
      };

    // View-only / admin accounts must see every seller's orders.
    // Live frontend still sends user_id for anyone whose role is not "admin".
    let viewerUser = req.user;
    if (!canViewAllOrders(viewerUser) && filters.user_id) {
      try {
        viewerUser = await User.findByPk(filters.user_id, {
          attributes: ['id', 'email', 'roleId'],
          include: [{ association: 'role', attributes: ['name'], required: false }],
        });
      } catch (_) {
        viewerUser = null;
      }
    }
    const viewerEmail = String(viewerUser?.email || req.user?.email || '').toLowerCase();
    if (
      canViewAllOrders(viewerUser) ||
      canViewAllOrders(req.user) ||
      /^viewer\d*@logixmitra\.com$/.test(viewerEmail)
    ) {
      delete filters.user_id;
    }

    const orders = await orderService.getAllOrders(filters);
    res.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: error.message });
  }
}


  async getOrderById(req, res) {
    try {
      const order = await orderService.getOrderById(req.params.id);
      res.json(order);
    } catch (error) {
      if (error.message === 'Order not found') {
        res.status(404).json({ error: error.message });
      } else {
        console.error('Get order error:', error);
        res.status(500).json({ error: error.message });
      }
    }
  }

  async updateOrder(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', errors: errors.array() });
      }

      const order = await orderService.updateOrder(req.params.id, req.body);
      res.json(order);
    } catch (error) {
      if (error.message === 'Order not found') {
        res.status(404).json({ error: error.message });
      } else if (error.message === 'Invalid order update payload') {
        res.status(400).json({ error: error.message });
      } else if (error.statusCode === 403) {
        res.status(403).json({ error: error.message });
      } else if (error.statusCode === 409) {
        res.status(409).json({ error: error.message });
      } else {
        console.error('Update order error:', error);
        res.status(500).json({ error: error.message });
      }
    }
  }

  async cloneOrder(req, res) {
    try {
      const cloned = await orderService.cloneOrder(req.params.id, req.body || {});
      res.status(201).json(cloned);
    } catch (error) {
      if (error.message === 'Order not found') {
        return res.status(404).json({ error: error.message });
      }
      if (error.statusCode === 409 || error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ error: 'Reference ID already exists' });
      }
      console.error('Clone order error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  async dispute_order(req, res) {
    try {
      const order = await orderService.dispute_order(req.body);
      if (order?.status === 400) {
        return res.status(400).json(order);
      }
      return res.status(200).json(order);
    } catch (error) {
      if (error.message === 'Order not found') {
        res.status(404).json({ error: error.message });
      } else {
        console.error('Update order error:', error);
        res.status(500).json({ error: error.message });
      }
    }
  }

  async processWeightDisputeUpload(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      if (!isAdminRole(req.user)) {
        return res.status(403).json({ error: 'Only admin can upload weight disputes' });
      }
      const result = await orderService.processWeightDisputeUpload(req.body.rows || []);
      return res.json(result);
    } catch (error) {
      console.error('Weight dispute upload error:', error);
      return res.status(500).json({ error: error.message });
    }
  }


  async createbulkshipment(req, res) {
    try {
      // const errors = validationResult(req);
      // if (!errors.isEmpty()) {
      //   return res.status(400).json({ errors: errors.array() });
      // }

      const order = await orderService.createbulkshipment(req.body);
      console.log(order,"controllerorder")
      let ress = { message: "Not Found", status: false };

      let msgg = "";
      const results = Array.isArray(order) ? order : [];
      results.forEach((v) => {
        if (v?.message) msgg += String(v.message) + "\n";
      });

      if (results.length > 0) {
        const successCount = results.filter((v) =>
          /shipment created successfully/i.test(String(v?.message || ""))
        ).length;
        const allSucceeded = successCount === results.length && successCount > 0;
        ress = {
          message: msgg.trim(),
          status: allSucceeded,
          createshipment: results,
        };
      }

      res.json(ress);
    } catch (error) {
      if (error.message === 'Order not found') {
        res.status(404).json({ error: error.message });
      } else {
        console.error('Update order error:', error);
        res.status(500).json({ error: error.message });
      }
    }
  }



  async cancelshipment(req, res) {
    try {
      // const errors = validationResult(req);
      // if (!errors.isEmpty()) {
      //   return res.status(400).json({ errors: errors.array() });
      // }

      const order = await orderService.cancelshipment(req.body.referenceId);

      // Mirror cancel or RTO-in-transit on Shopify (non-blocking).
      try {
        if (typeof orderService.syncShopifyOrderByReference === 'function') {
          orderService.syncShopifyOrderByReference(
            req.body.referenceId,
            order?.status || null
          );
        }
      } catch (syncErr) {
        console.warn(
          `[shopify] cancel sync failed for ${req.body.referenceId}:`,
          syncErr?.message || syncErr
        );
      }

      res.json(order);
    } catch (error) {
      if (error.message === 'Order not found') {
        res.status(404).json({ error: error.message });
      } else {
        console.error('Update order error:', error);
        res.status(500).json({ error: error.message });
      }
    }
  }

  async deleteOrder(req, res) {
    try {
      const result = await orderService.deleteOrder(req.params.id);
      res.json(result);
    } catch (error) {
      if (error.message === 'Order not found') {
        res.status(404).json({ error: error.message });
      } else {
        console.error('Delete order error:', error);
        res.status(500).json({ error: error.message });
      }
    }
  }

  async bulkDeleteOrders(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const isAdmin = String(req.user?.role?.name || req.user?.role || '').toLowerCase() === 'admin';
      const result = await orderService.bulkDeleteOrders(
        req.body.ids,
        isAdmin ? null : req.user.id
      );
      return res.json(result);
    } catch (error) {
      console.error('Bulk delete orders error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  async bulkCancelOrders(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const isAdmin = String(req.user?.role?.name || req.user?.role || '').toLowerCase() === 'admin';
      const result = await orderService.bulkCancelOrders(
        req.body.ids,
        isAdmin ? null : req.user.id,
        req.body.reason
      );
      return res.json(result);
    } catch (error) {
      console.error('Bulk cancel orders error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  async updateOrderStatus(req, res) {
    try {
      const { status } = req.body;
      const order = await orderService.updateOrderStatus(req.params.id, status);
      res.json(order);
    } catch (error) {
      if (error.message === 'Order not found') {
        res.status(404).json({ error: error.message });
      } else {
        console.error('Update status error:', error);
        res.status(500).json({ error: error.message });
      }
    }
  }

  async getOrderStats(req, res) {
    try {
      const stats = await orderService.getOrderStats();
      res.json(stats);
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // GET /orders/status-counts — exact per-chip totals using the same
  // filters as the list query (search/platform/courier/dates/direction).
  async getStatusCounts(req, res) {
    try {
      const filters = {
        platform: req.query.platform,
        search: req.query.search,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        startDateDay: req.query.startDateDay,
        endDateDay: req.query.endDateDay,
        user_id: req.query.user_id,
        courier: req.query.courier,
        financialStatus: req.query.financialStatus,
        awb: req.query.awb,
        direction: req.query.direction,
        dateType: req.query.dateType,
        orderType: req.query.orderType,
      };
      Object.keys(filters).forEach((k) => {
        if (filters[k] === undefined || filters[k] === null || filters[k] === '') delete filters[k];
      });

      let viewerUser = req.user;
      if (!canViewAllOrders(viewerUser) && filters.user_id) {
        try {
          viewerUser = await User.findByPk(filters.user_id, {
            attributes: ['id', 'email', 'roleId'],
            include: [{ association: 'role', attributes: ['name'], required: false }],
          });
        } catch (_) {
          viewerUser = null;
        }
      }
      const viewerEmail = String(viewerUser?.email || req.user?.email || '').toLowerCase();
      if (
        canViewAllOrders(viewerUser) ||
        canViewAllOrders(req.user) ||
        /^viewer\d*@logixmitra\.com$/.test(viewerEmail)
      ) {
        delete filters.user_id;
      }

      const counts = await orderService.getStatusCounts(filters);
      res.json({ success: true, counts });
    } catch (error) {
      console.error('Get status counts error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async markCodAsPaid(req, res) {
    try {
      const isAdmin = String(req.user?.role?.name || req.user?.role || '').toLowerCase() === 'admin';
      if (!isAdmin) {
        return res.status(403).json({ error: 'Only admin can mark COD as paid' });
      }

      const order = await orderService.markCodAsPaid(req.params.id);
      res.json(order);
    } catch (error) {
      if (error.message === 'Order not found') {
        return res.status(404).json({ error: error.message });
      }
      console.error('Mark COD as paid error:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new OrderController();

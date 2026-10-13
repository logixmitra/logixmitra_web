const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const b2bService = require('../services/b2bService');
const { Order, OrderItem } = require('../models');
const { Op } = require('sequelize');

function isAdmin(req) {
  return req.user?.role?.name === 'admin';
}

function actorUserId(req) {
  return req.user?.id;
}

// ---------- Rate cards ----------
router.get('/rate-cards', protect, async (req, res) => {
  try {
    const activeOnly = req.query.activeOnly === 'true' || !isAdmin(req);
    const mode = req.query.mode || undefined;
    const cards = await b2bService.listRateCards({ mode, activeOnly });
    res.json({ success: true, data: cards });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/rate-cards', protect, authorize('admin'), async (req, res) => {
  try {
    const card = await b2bService.createRateCard(req.body);
    res.status(201).json({ success: true, data: card });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/rate-cards/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const card = await b2bService.updateRateCard(req.params.id, req.body);
    res.json({ success: true, data: card });
  } catch (error) {
    const status = error.message === 'Rate card not found' ? 404 : 400;
    res.status(status).json({ success: false, message: error.message });
  }
});

router.delete('/rate-cards/:id', protect, authorize('admin'), async (req, res) => {
  try {
    await b2bService.deleteRateCard(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (error) {
    const status = error.message === 'Rate card not found' ? 404 : 400;
    res.status(status).json({ success: false, message: error.message });
  }
});

// ---------- Quote ----------
router.post('/quote', protect, async (req, res) => {
  try {
    const result = await b2bService.quote(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ---------- B2B MPS orders ----------
router.get('/orders', protect, async (req, res) => {
  try {
    const where = {
      orderType: { [Op.in]: ['B2B_MPS', 'B2B_FREIGHT'] },
    };
    if (req.query.orderType) where.orderType = req.query.orderType;
    if (!isAdmin(req)) {
      where.user_id = actorUserId(req);
    } else if (req.query.user_id) {
      where.user_id = req.query.user_id;
    }
    if (req.query.status) where.status = req.query.status;
    if (req.query.search) {
      const term = `%${req.query.search}%`;
      where[Op.or] = [
        { orderNumber: { [Op.iLike]: term } },
        { referenceId: { [Op.iLike]: term } },
        { awb: { [Op.iLike]: term } },
        { customerName: { [Op.iLike]: term } },
        { customerPhone: { [Op.iLike]: term } },
      ];
    }

    const orders = await Order.findAll({
      where,
      include: [{ model: OrderItem, as: 'items' }],
      order: [['createdAt', 'DESC']],
      limit: Math.min(Number(req.query.limit) || 100, 500),
    });
    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/orders', protect, async (req, res) => {
  try {
    const body = { ...req.body };
    if (!isAdmin(req)) body.user_id = actorUserId(req);
    const order = await b2bService.createB2bOrder(body, actorUserId(req));
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/orders/:id/book', protect, async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (!isAdmin(req) && order.user_id !== actorUserId(req)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const booked = await b2bService.bookB2bOrder(req.params.id, req.body, actorUserId(req));
    res.json({ success: true, data: booked });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ---------- Phase 2 Freight ----------
router.get('/freight', protect, async (req, res) => {
  try {
    const list = await b2bService.listFreightConsignments(
      {
        user_id: isAdmin(req) ? req.query.user_id : actorUserId(req),
        freightMode: req.query.freightMode,
        status: req.query.status,
      },
      isAdmin(req)
    );
    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/freight', protect, async (req, res) => {
  try {
    const body = { ...req.body };
    if (!isAdmin(req)) body.user_id = actorUserId(req);
    const result = await b2bService.createFreightConsignment(body, actorUserId(req));
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/freight/:id/book', protect, async (req, res) => {
  try {
    const booked = await b2bService.bookFreightConsignment(req.params.id, req.body, actorUserId(req));
    res.json({ success: true, data: booked });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.patch('/freight/:id/pickup', protect, async (req, res) => {
  try {
    const updated = await b2bService.updateFreightPickup(req.params.id, req.body);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.patch('/freight/:id/epod', protect, async (req, res) => {
  try {
    const updated = await b2bService.uploadFreightEpod(req.params.id, req.body);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;

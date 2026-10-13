const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { body, param } = require('express-validator');
const { protect, attachUserIfToken } = require('../middleware/authMiddleware');
const data_controller=require('../controllers/data_controller')
// Validation rules (create still uses flat body in some callers)
const orderValidation = [
  body('referenceId').notEmpty().withMessage('referenceId is required'),
  body('customerName').notEmpty().withMessage('Customer name is required'),
  body('customerPhone').notEmpty().withMessage('Customer phone is required'),
  body('seller').notEmpty().withMessage('Seller is required'),
  body('pincode').notEmpty().withMessage('Pincode is required'),
  body('city').notEmpty().withMessage('City is required'),
  body('state').notEmpty().withMessage('State is required'),
  body('addressLine1').notEmpty().withMessage('Address line 1 is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.name').notEmpty().withMessage('Item name is required'),
  body('items.*.unitPrice').isFloat({ min: 0 }).withMessage('Valid unit price is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Valid quantity is required')
];

// Frontend sends PUT { data: orderFields, user_id }
// Full edits include items; partial edits (e.g. COD amount) send only changed fields.
const isFullOrderUpdate = (_value, { req }) => Array.isArray(req.body?.data?.items);

const updateOrderValidation = [
  body('data').isObject().withMessage('data object is required'),
  body('data.referenceId').if(isFullOrderUpdate).notEmpty().withMessage('referenceId is required'),
  body('data.customerName').if(isFullOrderUpdate).notEmpty().withMessage('Customer name is required'),
  body('data.customerPhone').if(isFullOrderUpdate).notEmpty().withMessage('Customer phone is required'),
  body('data.pincode').if(isFullOrderUpdate).notEmpty().withMessage('Pincode is required'),
  body('data.city').if(isFullOrderUpdate).notEmpty().withMessage('City is required'),
  body('data.state').if(isFullOrderUpdate).notEmpty().withMessage('State is required'),
  body('data.addressLine1').if(isFullOrderUpdate).notEmpty().withMessage('Address line 1 is required'),
  body('data.items').optional().isArray({ min: 1 }).withMessage('At least one item is required'),
  body('data.totalOutstanding').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('COD amount must be a valid number'),
  body('data.amount').optional({ nullable: true }).isString().withMessage('Amount must be a string'),
];

const statusValidation = [
  body('status').isIn([
    'Pending', 'Processing', 'Shipped', 'In Transit', 'Out for Delivery',
    'Ready for Dispatch', 'READY FOR DISPATCH', 'Ready to Ship',
    'Delivered', 'UNDELIVERED', 'RTO', 'RTO In transit',
    'RTO Delivered', 'Cancelled', 'Disputed', 'Draft Merged'
  ]).withMessage('Invalid status')
];

const idValidation = [
  param('id').isUUID(4).withMessage('Invalid order ID')
];

const bulkIdsValidation = [
  body('ids').isArray({ min: 1, max: 100 }).withMessage('ids must contain between 1 and 100 order IDs'),
  body('ids.*').isUUID(4).withMessage('Each order ID must be a valid UUID'),
];

// Routes
router.get('/', attachUserIfToken, orderController.getAllOrders);

router.put('/bulkshipmentcreate', orderController.createbulkshipment);
router.put('/cancelshipment', orderController.cancelshipment);
router.post('/bulk-delete', protect, bulkIdsValidation, orderController.bulkDeleteOrders);
router.post(
  '/bulk-cancel',
  protect,
  [
    ...bulkIdsValidation,
    body('reason').optional().isString().trim().isLength({ max: 250 }).withMessage('Reason is too long'),
  ],
  orderController.bulkCancelOrders
);


router.get('/stats', orderController.getOrderStats);
router.get('/status-counts', attachUserIfToken, orderController.getStatusCounts);
router.post('/dispute_order', orderController.dispute_order);
router.post(
  '/weight-dispute-upload',
  protect,
  [
    body('rows').isArray({ min: 1, max: 2000 }).withMessage('rows must contain between 1 and 2000 entries'),
  ],
  orderController.processWeightDisputeUpload
);
router.post('/:id/clone', protect, idValidation, orderController.cloneOrder);
router.get('/:id', idValidation, orderController.getOrderById);
router.post('/', orderValidation, orderController.createOrder);

router.put('/:id', [...idValidation, ...updateOrderValidation], orderController.updateOrder);
router.patch('/:id/status', [...idValidation, ...statusValidation], orderController.updateOrderStatus);
router.delete('/:id', idValidation, orderController.deleteOrder);




router.get('/getUserOrdersWithShipment/:user_id',data_controller.getUserOrdersWithShipment);
router.get('/getCodRemittance/:user_id',data_controller.getCodRemittance);
router.patch('/:id/mark-cod-paid', protect, orderController.markCodAsPaid);

module.exports = router;

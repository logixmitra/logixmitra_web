const express = require('express');
const router = express.Router();
const sellerController = require('../controllers/sellerController');
const { body, param, query } = require('express-validator');
const data_controller = require('../controllers/data_controller');
const { protect, authorize } = require('../middleware/authMiddleware');
// Validation rules
const sellerValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('company').notEmpty().withMessage('Company name is required'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('address').notEmpty().withMessage('Address is required')
];

const statusValidation = [
  body('status').isIn(['active', 'blocked', 'pending']).withMessage('Invalid status')
];

const kycValidation = [
  body('kycStatus').isIn(['verified', 'pending', 'rejected']).withMessage('Invalid KYC status')
];

const walletValidation = [
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('type').isIn(['credit', 'debit']).withMessage('Type must be credit or debit')
];

const performanceValidation = [
  body('totalOrders').optional().isInt({ min: 0 }).withMessage('Total orders must be non-negative'),
  body('revenue').optional().isString(),
  body('performanceScore').optional().isFloat({ min: 0, max: 100 }).withMessage('Performance score must be between 0 and 100'),
  body('rtoRate').optional().isFloat({ min: 0, max: 100 }).withMessage('RTO rate must be between 0 and 100')
];

const idValidation = [
  param('id').custom((value) => {
    const s = String(value);
    if (/^\d+$/.test(s)) return true;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)) return true;
    throw new Error('Invalid seller ID');
  }),
];

const bulkImportValidation = [
  body('sellers').isArray({ min: 1 }).withMessage('Sellers array is required'),
  body('sellers.*.name').notEmpty(),
  body('sellers.*.email').isEmail(),
  body('sellers.*.company').notEmpty(),
  body('sellers.*.phone').notEmpty(),
  body('sellers.*.address').notEmpty()
];

// Admin-only: full seller directory
router.get('/', protect, authorize('admin'), sellerController.getAllSellers);
router.get('/stats', protect, authorize('admin'), sellerController.getSellerStats);
router.get('/:id/label-settings', protect, data_controller.getLabelSettings);
router.put('/:id/label-settings', protect, data_controller.updateLabelSettings);
router.get('/:id', protect, idValidation, sellerController.getSellerById);
router.post('/', protect, authorize('admin'), sellerValidation, sellerController.createSeller);
router.post('/bulk-import', protect, authorize('admin'), bulkImportValidation, sellerController.bulkImport);
router.put('/:id', protect, data_controller.updateSeller);
router.patch('/:id/status', protect, authorize('admin'), [...idValidation, ...statusValidation], sellerController.updateStatus);
router.patch('/:id/kyc', protect, authorize('admin'), [...idValidation, ...kycValidation], sellerController.updateKycStatus);
router.patch('/:id/approve', protect, authorize('admin'), idValidation, sellerController.approveSeller);
router.patch('/:id/wallet', protect, authorize('admin'), [...idValidation, ...walletValidation], sellerController.updateWallet);
router.patch('/:id/performance', protect, authorize('admin'), [...idValidation, ...performanceValidation], sellerController.updatePerformanceMetrics);
router.delete('/:id', protect, authorize('admin'), idValidation, sellerController.deleteSeller);

module.exports = router;

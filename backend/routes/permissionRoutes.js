const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect, authorize } = require('../middleware/authMiddleware');
const permissionController = require('../controllers/permissionController');

// All permission routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

router.get('/', permissionController.getPermissions);
router.get('/modules', permissionController.getModules);

router.post('/', [
  body('name').notEmpty().withMessage('Permission name is required'),
  body('module').notEmpty().withMessage('Module is required'),
  body('action').isIn(['create', 'read', 'update', 'delete']).withMessage('Invalid action'),
  body('description').optional()
], permissionController.createPermission);

router.put('/:id', [
  body('name').optional(),
  body('module').optional(),
  body('action').optional().isIn(['create', 'read', 'update', 'delete']),
  body('description').optional()
], permissionController.updatePermission);

router.delete('/:id', permissionController.deletePermission);

module.exports = router;
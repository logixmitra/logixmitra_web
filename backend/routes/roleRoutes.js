const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect, authorize } = require('../middleware/authMiddleware');
const roleController = require('../controllers/roleController');

// All role routes require authentication and admin role
// router.use(protect);
// router.use(authorize('admin'));

// Role management
router.get('/', roleController.getRoles);
router.get('/with-permissions', roleController.getRolesWithPermissions);

router.post('/', [
  body('name').notEmpty().withMessage('Role name is required'),
  body('description').optional()
], roleController.createRole);

router.put('/:id', [
  body('name').optional(),
  body('description').optional()
], roleController.updateRole);

router.delete('/:id', roleController.deleteRole);

// Role permissions
router.get('/:id/matrix', roleController.getRolePermissionMatrix);
router.put('/:id/permissions', roleController.updateRolePermissions);
router.post('/:id/reset', roleController.resetRole);

module.exports = router;
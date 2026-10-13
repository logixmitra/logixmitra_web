const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect, authorize } = require('../middleware/authMiddleware');
const userController = require('../controllers/userController');

// All user routes require authentication and admin role
//router.use(protect);
//router.use(authorize('admin'));

router.get('/', userController.getUsers);
router.get('/:id', userController.getUserById);

router.post('/', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('roleId').isInt().withMessage('Valid role ID is required'),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], userController.createUser);

router.put('/:id', [
  body('name').optional(),
  body('email').optional().isEmail(),
  body('roleId').optional().isInt(),
  body('mobile').optional()
], userController.updateUser);

router.delete('/:id', userController.deleteUser);

router.patch('/:id/status', [
  body('status').isIn(['active', 'inactive']).withMessage('Status must be active or inactive')
], userController.updateUserStatus);

router.post('/:id/reset-password', userController.resetPassword);

module.exports = router;

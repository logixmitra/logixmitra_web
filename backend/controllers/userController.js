const { User, Role } = require('../models');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');

const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    const whereClause = search ? {
      [Op.or]: [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { mobile: { [Op.iLike]: `%${search}%` } }
      ]
    } : {};

    const { count, rows } = await User.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['password'] },
      include: [{
        model: Role,
        as: 'role',
        attributes: ['id', 'name', 'description']
      }],
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    return res.json({
      success: true,
      data: rows.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile || '',
        role: user.role?.name || '',
        roleId: user.roleId,
        avatar: user.avatar,
        isActive: user.isActive,
        status: user.isActive ? 'active' : 'inactive',
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      })),
      total: count,
      page,
      totalPages: Math.ceil(count / limit)
    });

  } catch (error) {
    console.error('Get users error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] },
      include: [{
        model: Role,
        as: 'role',
        attributes: ['id', 'name', 'description']
      }]
    });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    return res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile || '',
        role: user.role?.name || '',
        roleId: user.roleId,
        avatar: user.avatar,
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        walletBalance: Number(user.walletBalance) || 0,
        pincode: user.pincode,
        ratechart: user.ratechart,


      } 
    });

  } catch (error) {
    console.error('Get user by id error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

const createUser = async (req, res) => {
  try {
    const { name, email, mobile, roleId, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        error: 'User with this email already exists' 
      });
    }

    // Check if role exists
    const role = await Role.findByPk(roleId);
    if (!role) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid role ID' 
      });
    }

    // Generate avatar from name
    const avatar = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

    // Create user
    const user = await User.create({
      name,
      email,
      mobile: mobile || '',
      password: password || 'default123', // Will be hashed by hook
      roleId,
      avatar,
      isActive: true
    });

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;

    return res.status(201).json({
      success: true,
      data: userResponse,
      message: 'User created successfully'
    });

  } catch (error) {
    console.error('Create user error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

const updateUser = async (req, res) => {
  try {
    // console.log('hiiiiiiiiiiiiiiii')
    // return
    const { id } = req.params;
    const { name, email, mobile, roleId, isActive } = req.body;

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Check if email is being changed and already exists
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          error: 'User with this email already exists' 
        });
      }
    }

    // Check if role exists
    if (roleId) {
      const role = await Role.findByPk(roleId);
      if (!role) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid role ID' 
        });
      }
    }

    await user.update({
      name: name || user.name,
      email: email || user.email,
      mobile: mobile !== undefined ? mobile : user.mobile,
      roleId: roleId || user.roleId,
      isActive: isActive !== undefined ? isActive : user.isActive
    });

    // Fetch updated user with role
    const updatedUser = await User.findByPk(id, {
      attributes: { exclude: ['password'] },
      include: [{
        model: Role,
        as: 'role',
        attributes: ['id', 'name']
      }]
    });

    return res.json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully'
    });

  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Don't allow deleting yourself
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot delete your own account' 
      });
    }

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    await user.destroy();

    return res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Don't allow deactivating yourself
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot change your own status' 
      });
    }

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    const isActive = status === 'active';

    await user.update({ isActive });

    return res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`
    });

  } catch (error) {
    console.error('Update user status error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Generate random password
    const newPassword = Math.random().toString(36).slice(-8);
    
    // Hash and set new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await user.update({ password: hashedPassword });

    // In production, you would email the password
    console.log(`Password reset for ${user.email}: ${newPassword}`);

    return res.json({
      success: true,
      message: 'Password reset successfully',
      data: process.env.NODE_ENV === 'development' ? { newPassword } : undefined
    });

  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  updateUserStatus,
  resetPassword
};
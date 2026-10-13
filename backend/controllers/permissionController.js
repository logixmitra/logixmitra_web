const { Permission, ModulePermission } = require('../models');
const { Op } = require('sequelize');

const getPermissions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    const whereClause = search ? {
      [Op.or]: [
        { name: { [Op.iLike]: `%${search}%` } },
        { module: { [Op.iLike]: `%${search}%` } }
      ]
    } : {};

    const { count, rows } = await Permission.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['module', 'ASC'], ['action', 'ASC']]
    });

    return res.json({
      success: true,
      data: rows,
      total: count,
      page,
      totalPages: Math.ceil(count / limit)
    });

  } catch (error) {
    console.error('Get permissions error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

const createPermission = async (req, res) => {
  try {
    const { name, module, action, description } = req.body;

    const existingPermission = await Permission.findOne({
      where: { module, action }
    });

    if (existingPermission) {
      return res.status(400).json({ 
        success: false, 
        error: 'Permission for this module and action already exists' 
      });
    }

    const permission = await Permission.create({
      name,
      module,
      action,
      description
    });

    return res.status(201).json({
      success: true,
      data: permission,
      message: 'Permission created successfully'
    });

  } catch (error) {
    console.error('Create permission error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

const updatePermission = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, module, action, description } = req.body;

    const permission = await Permission.findByPk(id);

    if (!permission) {
      return res.status(404).json({ 
        success: false, 
        error: 'Permission not found' 
      });
    }

    // Check for duplicate if module/action changed
    if (module !== permission.module || action !== permission.action) {
      const existing = await Permission.findOne({
        where: { module, action }
      });
      if (existing) {
        return res.status(400).json({ 
          success: false, 
          error: 'Permission for this module and action already exists' 
        });
      }
    }

    await permission.update({ name, module, action, description });

    return res.json({
      success: true,
      data: permission,
      message: 'Permission updated successfully'
    });

  } catch (error) {
    console.error('Update permission error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

const deletePermission = async (req, res) => {
  try {
    const { id } = req.params;

    const permission = await Permission.findByPk(id);

    if (!permission) {
      return res.status(404).json({ 
        success: false, 
        error: 'Permission not found' 
      });
    }

    // Check if permission is assigned to any role
    const usageCount = await ModulePermission.count({
      where: { permissionId: id }
    });

    if (usageCount > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot delete permission that is assigned to roles' 
      });
    }

    await permission.destroy();

    return res.json({
      success: true,
      message: 'Permission deleted successfully'
    });

  } catch (error) {
    console.error('Delete permission error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

const getModules = async (req, res) => {
  try {
    const modules = await Permission.findAll({
      attributes: ['module'],
      group: ['module'],
      order: [['module', 'ASC']]
    });

    return res.json({
      success: true,
      data: modules.map(m => m.module)
    });

  } catch (error) {
    console.error('Get modules error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

module.exports = {
  getPermissions,
  createPermission,
  updatePermission,
  deletePermission,
  getModules
};
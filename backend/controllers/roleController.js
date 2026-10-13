const { Role, Permission, ModulePermission, User } = require('../models');
const { Op } = require('sequelize');
const {
  ACTIONS,
  DEFAULT_MODULES,
  SELLER_DEFAULT_MODULES,
  buildDefaultPermissionRows,
} = require('../config/defaultModules');

const isProtectedSystemRole = (role) => {
  const name = String(role?.name || '').toLowerCase();
  return name === 'admin' || name === 'super admin';
};

const getRoles = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    const whereClause = search ? {
      name: { [Op.iLike]: `%${search}%` }
    } : {};

    const { count, rows } = await Role.findAndCountAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'users',
        attributes: ['id'],
        required: false
      }],
      distinct: true,
      limit,
      offset,
      order: [['name', 'ASC']]
    });

    const roles = rows.map(role => ({
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      usersCount: role.users.length,
      modulePermissions: []
    }));

    return res.json({
      success: true,
      data: roles,
      total: count,
      page,
      totalPages: Math.ceil(count / limit)
    });

  } catch (error) {
    console.error('Get roles error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

const getRolesWithPermissions = async (req, res) => {
  try {
    const roles = await Role.findAll({
      include: [{
        model: Permission,
        as: 'permissions',
        through: { attributes: [] }
      }],
      order: [['name', 'ASC']]
    });

    return res.json({
      success: true,
      data: roles.map(role => ({
        id: role.id,
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
        canEditPermissions: !isProtectedSystemRole(role),
        permissions: role.permissions
      }))
    });

  } catch (error) {
    console.error('Get roles with permissions error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

const createRole = async (req, res) => {
  try {
    const { name, description } = req.body;

    const existingRole = await Role.findOne({ where: { name } });
    if (existingRole) {
      return res.status(400).json({ 
        success: false, 
        error: 'Role with this name already exists' 
      });
    }

    const role = await Role.create({
      name,
      description,
      isSystem: false
    });

    return res.status(201).json({
      success: true,
      data: role,
      message: 'Role created successfully'
    });

  } catch (error) {
    console.error('Create role error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const role = await Role.findByPk(id);

    if (!role) {
      return res.status(404).json({ 
        success: false, 
        error: 'Role not found' 
      });
    }

    if (role.isSystem) {
      return res.status(403).json({ 
        success: false, 
        error: 'Cannot modify system roles' 
      });
    }

    await role.update({ name, description });

    return res.json({
      success: true,
      data: role,
      message: 'Role updated successfully'
    });

  } catch (error) {
    console.error('Update role error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;

    const role = await Role.findByPk(id);

    if (!role) {
      return res.status(404).json({ 
        success: false, 
        error: 'Role not found' 
      });
    }

    if (role.isSystem) {
      return res.status(403).json({ 
        success: false, 
        error: 'Cannot delete system roles' 
      });
    }

    const userCount = await User.count({ where: { roleId: id } });
    if (userCount > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot delete role with assigned users' 
      });
    }

    await ModulePermission.destroy({ where: { roleId: id } });
    await role.destroy();

    return res.json({
      success: true,
      message: 'Role deleted successfully'
    });

  } catch (error) {
    console.error('Delete role error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

const getRolePermissionMatrix = async (req, res) => {
  try {
    const { id } = req.params;

    const role = await Role.findByPk(id);
    if (!role) {
      return res.status(404).json({ 
        success: false, 
        error: 'Role not found' 
      });
    }

    // Ensure default module permission rows exist so matrix never comes back empty
    const defaultRows = buildDefaultPermissionRows(DEFAULT_MODULES);
    for (const row of defaultRows) {
      await Permission.findOrCreate({
        where: { module: row.module, action: row.action },
        defaults: row,
      });
    }

    const permissions = await Permission.findAll({
      order: [['module', 'ASC'], ['action', 'ASC']]
    });

    const rolePermissions = await ModulePermission.findAll({
      where: { roleId: id },
      attributes: ['permissionId']
    });

    const rolePermissionIds = new Set(
      rolePermissions.map((rp) => Number(rp.permissionId))
    );

    const modulesFromDb = [...new Set(permissions.map((p) => p.module))];
    const modules = [...new Set([...DEFAULT_MODULES, ...modulesFromDb])];

    const matrix = modules.map((module) => {
      const modulePermissions = permissions.filter((p) => p.module === module);
      const actionMap = new Map(
        modulePermissions.map((p) => [p.action, rolePermissionIds.has(Number(p.id))])
      );

      return {
        module,
        actions: ACTIONS.map((action) => ({
          action,
          hasPermission: actionMap.get(action) || false,
        })),
      };
    });

    return res.json({
      success: true,
      data: {
        role: {
          id: role.id,
          name: role.name,
          description: role.description,
          isSystem: role.isSystem,
          canEditPermissions: !isProtectedSystemRole(role),
        },
        matrix,
        allModules: modules
      }
    });

  } catch (error) {
    console.error('Get role permission matrix error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Server error' 
    });
  }
};

const updateRolePermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const { modulePermissions } = req.body;

    const role = await Role.findByPk(id);

    if (!role) {
      return res.status(404).json({ 
        success: false, 
        error: 'Role not found' 
      });
    }

    if (isProtectedSystemRole(role)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Cannot modify admin role permissions' 
      });
    }

    if (!Array.isArray(modulePermissions)) {
      return res.status(400).json({
        success: false,
        error: 'modulePermissions must be an array',
      });
    }

    // Get all permission IDs that should be assigned
    const permissionIds = [];
    
    for (const mp of modulePermissions) {
      const actions = Array.isArray(mp.actions) ? mp.actions : [];
      if (!mp.module || actions.length === 0) continue;

      const permissions = await Permission.findAll({
        where: {
          module: mp.module,
          action: { [Op.in]: actions },
        }
      });
      permissionIds.push(...permissions.map(p => p.id));
    }

    // Update permissions
    await ModulePermission.destroy({ where: { roleId: id } });
    
    if (permissionIds.length > 0) {
      await ModulePermission.bulkCreate(
        permissionIds.map(permissionId => ({
          roleId: id,
          permissionId
        }))
      );
    }

    return res.json({
      success: true,
      message: 'Role permissions updated successfully'
    });

  } catch (error) {
    console.error('Update role permissions error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

const resetRole = async (req, res) => {
  try {
    const { id } = req.params;

    const role = await Role.findByPk(id);

    if (!role) {
      return res.status(404).json({ 
        success: false, 
        error: 'Role not found' 
      });
    }

    if (!role.isSystem) {
      return res.status(400).json({ 
        success: false, 
        error: 'Only system roles can be reset' 
      });
    }

    // Reset to default permissions based on role name
    const defaultPermissions = getDefaultPermissions(role.name);
    
    const permissionIds = [];
    for (const perm of defaultPermissions) {
      const permission = await Permission.findOne({
        where: {
          module: perm.module,
          action: perm.action
        }
      });
      if (permission) {
        permissionIds.push(permission.id);
      }
    }

    await ModulePermission.destroy({ where: { roleId: id } });
    
    if (permissionIds.length > 0) {
      await ModulePermission.bulkCreate(
        permissionIds.map(permissionId => ({
          roleId: id,
          permissionId
        }))
      );
    }

    return res.json({
      success: true,
      message: 'Role reset to default permissions'
    });

  } catch (error) {
    console.error('Reset role error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

// Helper function to get default permissions
const getDefaultPermissions = (roleName) => {
  const key = String(roleName || '').toLowerCase();

  if (key === 'admin' || key === 'super admin') {
    return buildDefaultPermissionRows(DEFAULT_MODULES).map((r) => ({
      module: r.module,
      action: r.action,
    }));
  }

  if (key === 'seller') {
    return SELLER_DEFAULT_MODULES.flatMap((module) =>
      ['create', 'read', 'update'].map((action) => ({ module, action }))
    );
  }

  const defaults = {
    manager: [
      { module: 'Dashboard', action: 'read' },
      { module: 'Orders', action: 'create' },
      { module: 'Orders', action: 'read' },
      { module: 'Orders', action: 'update' },
      { module: 'Warehouse', action: 'read' },
      { module: 'Reports', action: 'read' },
    ],
    user: [
      { module: 'Dashboard', action: 'read' },
      { module: 'Orders', action: 'read' },
    ],
  };

  return defaults[key] || [
    { module: 'Dashboard', action: 'read' },
    { module: 'Orders', action: 'read' },
  ];
};

module.exports = {
  getRoles,
  getRolesWithPermissions,
  createRole,
  updateRole,
  deleteRole,
  getRolePermissionMatrix,
  updateRolePermissions,
  resetRole
};
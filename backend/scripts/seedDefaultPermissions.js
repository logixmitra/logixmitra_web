/**
 * Seed default module permission data (permissions table + role links).
 *
 * Run:
 *   node scripts/seedDefaultPermissions.js
 *   npm run seed:permissions
 *
 * Creates:
 *   - CRUD permissions for every default module
 *   - admin role → all actions on all modules
 *   - seller role → create/read/update on seller modules
 */

require('dotenv').config();

const {
  Role,
  Permission,
  ModulePermission,
} = require('../models');
const sequelize = require('../config/database');
const {
  ACTIONS,
  DEFAULT_MODULES,
  SELLER_DEFAULT_MODULES,
  buildDefaultPermissionRows,
} = require('../config/defaultModules');

async function syncSequence(tableName, idColumn = 'id') {
  try {
    await sequelize.query(
      `SELECT setval(pg_get_serial_sequence('${tableName}', '${idColumn}'), COALESCE((SELECT MAX(${idColumn}) FROM ${tableName}), 1), true);`
    );
  } catch (err) {
    console.warn(`Sequence sync skipped for ${tableName}:`, err.message);
  }
}

async function ensureRoles() {
  await syncSequence('roles');

  const [adminRole] = await Role.findOrCreate({
    where: { name: 'admin' },
    defaults: {
      name: 'admin',
      description: 'Full system access',
      isSystem: true,
    },
  });

  await syncSequence('roles');

  const [sellerRole] = await Role.findOrCreate({
    where: { name: 'seller' },
    defaults: {
      name: 'seller',
      description: 'Seller operational access',
      isSystem: true,
    },
  });

  return { adminRole, sellerRole };
}

async function ensurePermissions() {
  const rows = buildDefaultPermissionRows(DEFAULT_MODULES);
  const permissions = [];

  for (const row of rows) {
    const [perm] = await Permission.findOrCreate({
      where: { module: row.module, action: row.action },
      defaults: row,
    });

    // Keep description/name fresh if row already existed
    if (perm.name !== row.name || perm.description !== row.description) {
      await perm.update({
        name: row.name,
        description: row.description,
      });
    }

    permissions.push(perm);
  }

  return permissions;
}

async function linkRolePermissions(role, permissions, actionsFilter = null) {
  let linked = 0;
  for (const perm of permissions) {
    if (actionsFilter && !actionsFilter.includes(perm.action)) continue;

    const [, created] = await ModulePermission.findOrCreate({
      where: {
        roleId: role.id,
        permissionId: perm.id,
      },
      defaults: {
        roleId: role.id,
        permissionId: perm.id,
      },
    });
    if (created) linked += 1;
  }
  return linked;
}

async function seedDefaultPermissions() {
  await sequelize.authenticate();
  await syncSequence('roles');
  await syncSequence('permissions');
  await syncSequence('module_permissions');

  const { adminRole, sellerRole } = await ensureRoles();
  const permissions = await ensurePermissions();

  const adminLinked = await linkRolePermissions(adminRole, permissions);

  const sellerModuleSet = new Set(SELLER_DEFAULT_MODULES);
  const sellerPerms = permissions.filter((p) => sellerModuleSet.has(p.module));
  const sellerLinked = await linkRolePermissions(sellerRole, sellerPerms, [
    'create',
    'read',
    'update',
  ]);

  const summary = {
    modules: DEFAULT_MODULES.length,
    actions: ACTIONS,
    permissionsCreatedOrFound: permissions.length,
    adminRoleId: adminRole.id,
    sellerRoleId: sellerRole.id,
    adminLinksAdded: adminLinked,
    sellerLinksAdded: sellerLinked,
    sellerModules: SELLER_DEFAULT_MODULES.length,
  };

  console.log('Default module permissions seeded successfully:');
  console.log(JSON.stringify(summary, null, 2));
  return summary;
}

if (require.main === module) {
  seedDefaultPermissions()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('seedDefaultPermissions failed:', err);
      process.exit(1);
    });
}

module.exports = { seedDefaultPermissions };

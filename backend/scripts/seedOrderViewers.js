/**
 * Create order_viewer role (read-only all orders) and three users.
 *
 * Run:  node scripts/seedOrderViewers.js
 *   or: npm run seed:viewers
 *
 * Logins:
 *   viewer1@logixmitra.com / Viewer@123
 *   viewer2@logixmitra.com / Viewer@123
 *   viewer3@logixmitra.com / Viewer@123
 */

require('dotenv').config();

const { User, Role, Permission, ModulePermission } = require('../models');
const sequelize = require('../config/database');

const ORDER_VIEWER_ROLE = 'order_viewer';

const VIEWER_MODULES = ['Dashboard', 'Orders', 'NDR', 'NDR/RTO'];

const VIEWER_USERS = [
  {
    email: 'viewer1@logixmitra.com',
    password: 'Viewer@123',
    name: 'Order Viewer 1',
    phone: '9999991001',
    avatar: 'V1',
  },
  {
    email: 'viewer2@logixmitra.com',
    password: 'Viewer@123',
    name: 'Order Viewer 2',
    phone: '9999991002',
    avatar: 'V2',
  },
  {
    email: 'viewer3@logixmitra.com',
    password: 'Viewer@123',
    name: 'Order Viewer 3',
    phone: '9999991003',
    avatar: 'V3',
  },
];

async function syncSequence(tableName, idColumn = 'id') {
  try {
    await sequelize.query(
      `SELECT setval(pg_get_serial_sequence('${tableName}', '${idColumn}'), COALESCE((SELECT MAX(${idColumn}) FROM ${tableName}), 1), true);`
    );
  } catch (err) {
    console.warn(`Sequence sync skipped for ${tableName}:`, err.message);
  }
}

async function ensureViewerRole() {
  await syncSequence('roles');
  const [role] = await Role.findOrCreate({
    where: { name: ORDER_VIEWER_ROLE },
    defaults: {
      name: ORDER_VIEWER_ROLE,
      description: 'View all orders (read-only, no create/edit/cancel)',
      isSystem: true,
    },
  });
  return role;
}

async function linkReadPermissions(role) {
  const permissions = [];

  for (const moduleName of VIEWER_MODULES) {
    const [perm] = await Permission.findOrCreate({
      where: { module: moduleName, action: 'read' },
      defaults: {
        name: `read ${moduleName}`,
        module: moduleName,
        action: 'read',
        description: `Can read ${moduleName}`,
      },
    });
    permissions.push(perm);
  }

  let linked = 0;
  for (const perm of permissions) {
    const [, created] = await ModulePermission.findOrCreate({
      where: { roleId: role.id, permissionId: perm.id },
      defaults: { roleId: role.id, permissionId: perm.id },
    });
    if (created) linked += 1;
  }
  return { found: permissions.length, linked };
}

async function upsertViewer(userData, roleId) {
  let user = await User.findOne({ where: { email: userData.email } });

  const payload = {
    name: userData.name,
    email: userData.email,
    password: userData.password,
    roleId,
    company: 'LogixMitra View Only',
    phone: userData.phone,
    mobile: userData.phone,
    address: 'View-only access, LogixMitra',
    city: 'Gurugram',
    state: 'Haryana',
    pincode: '122001',
    walletBalance: 0,
    avatar: userData.avatar,
    isActive: true,
    status: 'active',
    kycStatus: 'verified',
    riskCategory: 'low',
    subscription: 'Trial',
  };

  if (user) {
    await user.update(payload);
    user = await User.findByPk(user.id);
  } else {
    user = await User.create(payload);
  }

  return user;
}

async function seedOrderViewers() {
  await sequelize.authenticate();
  await syncSequence('roles');
  await syncSequence('permissions');
  await syncSequence('module_permissions');
  await syncSequence('user_sellers');

  const role = await ensureViewerRole();
  const permSummary = await linkReadPermissions(role);

  const users = [];
  for (const u of VIEWER_USERS) {
    const user = await upsertViewer(u, role.id);
    users.push({
      id: user.id,
      email: u.email,
      password: u.password,
      name: u.name,
      role: ORDER_VIEWER_ROLE,
    });
  }

  return {
    success: true,
    roleId: role.id,
    role: ORDER_VIEWER_ROLE,
    permissions: permSummary,
    logins: users,
  };
}

async function runCli() {
  try {
    const result = await seedOrderViewers();
    console.log(JSON.stringify(result, null, 2));
    console.log('\n--- Order viewer logins (view all orders, read-only) ---');
    for (const u of result.logins) {
      console.log(`${u.email} / ${u.password}`);
    }
    process.exit(0);
  } catch (err) {
    console.error('seedOrderViewers failed:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  runCli();
}

module.exports = { seedOrderViewers, VIEWER_USERS, ORDER_VIEWER_ROLE };

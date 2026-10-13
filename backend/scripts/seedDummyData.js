/**
 * Seed dummy roles, permissions, users, wallet & warehouse for local testing.
 *
 * Run:  npm run seed
 * Or:   POST /api/auth/seed-dummy  (development only)
 *
 * Test logins:
 *   Admin  → admin@logixmitra.test  / Admin@123
 *   Seller → seller@logixmitra.test / Seller@123
 */

require('dotenv').config();

const {
  User,
  Role,
  Permission,
  ModulePermission,
  Wallet,
  Warehouse
} = require('../models');
const sequelize = require('../config/database');
const {
  ACTIONS,
  DEFAULT_MODULES,
  SELLER_DEFAULT_MODULES,
} = require('../config/defaultModules');

const MODULES = DEFAULT_MODULES;

const TEST_USERS = [
  {
    email: 'admin@logixmitra.test',
    password: 'Admin@123',
    name: 'Demo Admin',
    roleName: 'admin',
    company: 'LogixMitra Admin',
    phone: '9999990001',
    address: 'Admin Office, Gurugram, HR',
    city: 'Gurugram',
    state: 'Haryana',
    pincode: '122001',
    walletBalance: 0,
    avatar: 'A'
  },
  {
    email: 'seller@logixmitra.test',
    password: 'Seller@123',
    name: 'Demo Seller',
    roleName: 'seller',
    company: 'Demo Seller Pvt Ltd',
    phone: '9999990002',
    address: 'Seller Warehouse Lane, Delhi',
    city: 'Delhi',
    state: 'Delhi',
    pincode: '110001',
    walletBalance: 5000,
    avatar: 'S'
  }
];

async function syncSequence(tableName, idColumn = 'id') {
  try {
    await sequelize.query(
      `SELECT setval(pg_get_serial_sequence('${tableName}', '${idColumn}'), COALESCE((SELECT MAX(${idColumn}) FROM ${tableName}), 1), true);`
    );
  } catch (err) {
    // Non-fatal on DBs without serial sequences
    console.warn(`Sequence sync skipped for ${tableName}:`, err.message);
  }
}

async function ensureRoles() {
  await syncSequence('roles');

  const [adminRole] = await Role.findOrCreate({
    where: { name: 'admin' },
    defaults: {
      name: 'admin',
      description: 'Full system access (dummy)',
      isSystem: true
    }
  });

  await syncSequence('roles');

  const [sellerRole] = await Role.findOrCreate({
    where: { name: 'seller' },
    defaults: {
      name: 'seller',
      description: 'Seller access (dummy)',
      isSystem: true
    }
  });

  return { adminRole, sellerRole };
}

async function ensurePermissions() {
  const permissions = [];

  for (const moduleName of MODULES) {
    for (const action of ACTIONS) {
      const [perm] = await Permission.findOrCreate({
        where: { module: moduleName, action },
        defaults: {
          name: `${action} ${moduleName}`,
          module: moduleName,
          action,
          description: `Can ${action} ${moduleName}`
        }
      });
      permissions.push(perm);
    }
  }

  return permissions;
}

async function linkRolePermissions(role, permissions, actionsFilter = null) {
  for (const perm of permissions) {
    if (actionsFilter && !actionsFilter.includes(perm.action)) continue;

    await ModulePermission.findOrCreate({
      where: {
        roleId: role.id,
        permissionId: perm.id
      },
      defaults: {
        roleId: role.id,
        permissionId: perm.id
      }
    });
  }
}

async function upsertUser(userData, roleId) {
  let user = await User.findOne({ where: { email: userData.email } });

  const payload = {
    name: userData.name,
    email: userData.email,
    password: userData.password,
    roleId,
    company: userData.company,
    phone: userData.phone,
    mobile: userData.phone,
    address: userData.address,
    city: userData.city,
    state: userData.state,
    pincode: userData.pincode,
    walletBalance: userData.walletBalance,
    avatar: userData.avatar,
    isActive: true,
    status: 'active',
    kycStatus: 'verified',
    riskCategory: 'low',
    subscription: 'Growth',
    performanceScore: 92,
    rtoRate: 2.5,
    totalOrders: 12,
    revenue: '₹45000'
  };

  if (user) {
    // Update fields; password change triggers hash via beforeUpdate hook
    await user.update(payload);
    user = await User.findByPk(user.id);
  } else {
    user = await User.create(payload);
  }

  return user;
}

async function seedWallet(user) {
  const existing = await Wallet.findOne({
    where: {
      user_id: user.id,
      transid: 'DUMMY-SEED-CREDIT'
    }
  });

  if (existing) return existing;

  return Wallet.create({
    user_id: user.id,
    transid: 'DUMMY-SEED-CREDIT',
    amount: user.walletBalance || 1000,
    status: 'Approved',
    description: 'Dummy seed wallet credit for testing'
  });
}

async function seedWarehouse(user) {
  const [warehouse] = await Warehouse.findOrCreate({
    where: {
      user_id: user.id,
      name: 'Demo Seller Warehouse'
    },
    defaults: {
      name: 'Demo Seller Warehouse',
      address: 'Plot 12, Industrial Area',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110001',
      contactPerson: user.name,
      phone: user.phone || '9999990002',
      user_id: user.id,
      isActive: true,
      isDefault: true
    }
  });

  return warehouse;
}

async function seedDummyData() {
  await sequelize.authenticate();
  await syncSequence('roles');
  await syncSequence('permissions');
  await syncSequence('module_permissions');
  await syncSequence('user_sellers');
  await syncSequence('wallet');

  const { adminRole, sellerRole } = await ensureRoles();
  const permissions = await ensurePermissions();

  // Admin: all CRUD on all modules
  await linkRolePermissions(adminRole, permissions);

  // Seller: create/read/update on operational modules
  const sellerModules = new Set(SELLER_DEFAULT_MODULES);
  const sellerPerms = permissions.filter((p) => sellerModules.has(p.module));
  await linkRolePermissions(sellerRole, sellerPerms, ['create', 'read', 'update']);

  const roleMap = {
    admin: adminRole,
    seller: sellerRole
  };

  const createdUsers = [];

  for (const u of TEST_USERS) {
    const role = roleMap[u.roleName];
    const user = await upsertUser(u, role.id);
    createdUsers.push({
      id: user.id,
      email: u.email,
      password: u.password,
      role: u.roleName,
      name: u.name,
      walletBalance: user.walletBalance
    });

    if (u.roleName === 'seller') {
      await seedWallet(user);
      await seedWarehouse(user);
    }
  }

  return {
    success: true,
    message: 'Dummy data seeded successfully',
    logins: createdUsers.map((u) => ({
      role: u.role,
      email: u.email,
      password: u.password,
      userId: u.id
    })),
    hint: 'POST /api/auth/login with email + password from logins above'
  };
}

async function runCli() {
  try {
    console.log('Seeding dummy data...');
    const result = await seedDummyData();
    console.log(JSON.stringify(result, null, 2));
    console.log('\n--- Test logins ---');
    console.log('Admin : admin@logixmitra.test / Admin@123');
    console.log('Seller: seller@logixmitra.test / Seller@123');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  runCli();
}

module.exports = { seedDummyData, TEST_USERS };

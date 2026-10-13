/**
 * Create / refresh the Super Admin login with full system access.
 *
 * The Super Admin is created as a user named "Super Admin" on the existing
 * `admin` role (the full-access role used by every admin gate in the API),
 * and that role is linked to every default module permission.
 *
 * Run:  node scripts/seedSuperAdmin.js
 *   or: npm run seed:superadmin
 *
 * Optional credential overrides:
 *   SUPER_ADMIN_EMAIL=someone@logixmitra.com SUPER_ADMIN_PASSWORD=Secret@123 npm run seed:superadmin
 *   node scripts/seedSuperAdmin.js someone@logixmitra.com Secret@123
 *
 * Default login:
 *   admin@logixmitra.com / Admin@123
 */

require('dotenv').config();

const { User, Role, Permission, ModulePermission } = require('../models');
const sequelize = require('../config/database');
const { ACTIONS, DEFAULT_MODULES } = require('../config/defaultModules');

/** Full-access role name — matches authorize('admin') / checkPermission gates */
const ROLE_NAME = 'admin';

const SUPER_ADMIN = {
  name: process.env.SUPER_ADMIN_NAME || 'Super Admin',
  email: String(
    process.env.SUPER_ADMIN_EMAIL || process.argv[2] || 'admin@logixmitra.com'
  )
    .trim()
    .toLowerCase(),
  password: process.env.SUPER_ADMIN_PASSWORD || process.argv[3] || 'Admin@123',
  company: process.env.SUPER_ADMIN_COMPANY || 'LogixMitra',
  phone: process.env.SUPER_ADMIN_PHONE || '9999990000',
  address: process.env.SUPER_ADMIN_ADDRESS || 'LogixMitra HQ, Gurugram, HR',
  city: process.env.SUPER_ADMIN_CITY || 'Gurugram',
  state: process.env.SUPER_ADMIN_STATE || 'Haryana',
  pincode: process.env.SUPER_ADMIN_PINCODE || '122001',
  avatar: 'SA',
  walletBalance: 0,
};

/**
 * Keep Postgres identity sequences ahead of existing rows before inserts.
 * Non-fatal on databases without serial sequences.
 */
async function syncSequence(tableName, idColumn = 'id') {
  try {
    await sequelize.query(
      `SELECT setval(pg_get_serial_sequence('${tableName}', '${idColumn}'), COALESCE((SELECT MAX(${idColumn}) FROM ${tableName}), 1), true);`
    );
  } catch (err) {
    console.warn(`Sequence sync skipped for ${tableName}:`, err.message);
  }
}

async function ensureAdminRole() {
  await syncSequence('roles');

  const [role] = await Role.findOrCreate({
    where: { name: ROLE_NAME },
    defaults: {
      name: ROLE_NAME,
      description: 'Full system access',
      isSystem: true,
    },
  });

  return role;
}

async function ensurePermissions() {
  await syncSequence('permissions');

  const permissions = [];

  for (const moduleName of DEFAULT_MODULES) {
    for (const action of ACTIONS) {
      const [perm] = await Permission.findOrCreate({
        where: { module: moduleName, action },
        defaults: {
          name: `${action} ${moduleName}`,
          module: moduleName,
          action,
          description: `Can ${action} ${moduleName}`,
        },
      });
      permissions.push(perm);
    }
  }

  return permissions;
}

async function linkRolePermissions(role, permissions) {
  await syncSequence('module_permissions');

  let linked = 0;

  for (const perm of permissions) {
    const [, created] = await ModulePermission.findOrCreate({
      where: { roleId: role.id, permissionId: perm.id },
      defaults: { roleId: role.id, permissionId: perm.id },
    });
    if (created) linked += 1;
  }

  return linked;
}

async function upsertSuperAdmin(roleId) {
  await syncSequence('user_sellers');

  let user = await User.findOne({ where: { email: SUPER_ADMIN.email } });

  const payload = {
    name: SUPER_ADMIN.name,
    email: SUPER_ADMIN.email,
    password: SUPER_ADMIN.password,
    roleId,
    company: SUPER_ADMIN.company,
    phone: SUPER_ADMIN.phone,
    mobile: SUPER_ADMIN.phone,
    address: SUPER_ADMIN.address,
    city: SUPER_ADMIN.city,
    state: SUPER_ADMIN.state,
    pincode: SUPER_ADMIN.pincode,
    walletBalance: SUPER_ADMIN.walletBalance,
    avatar: SUPER_ADMIN.avatar,
    isActive: true,
    status: 'active',
    kycStatus: 'verified',
    riskCategory: 'low',
    subscription: 'Enterprise',
  };

  if (user) {
    // Password change is hashed by the User beforeUpdate hook
    await user.update(payload);
    user = await User.findByPk(user.id);
  } else {
    user = await User.create(payload);
  }

  return user;
}

async function seedSuperAdmin() {
  await sequelize.authenticate();

  const role = await ensureAdminRole();
  const permissions = await ensurePermissions();
  const linked = await linkRolePermissions(role, permissions);
  const user = await upsertSuperAdmin(role.id);

  const passwordMatches = await user.comparePassword(SUPER_ADMIN.password);

  return {
    success: true,
    message: 'Super admin credential inserted successfully',
    role: {
      id: role.id,
      name: role.name,
      permissionsFound: permissions.length,
      permissionsLinked: linked,
    },
    logins: [
      {
        role: role.name,
        name: user.name,
        email: SUPER_ADMIN.email,
        password: SUPER_ADMIN.password,
        userId: user.id,
        isActive: user.isActive,
        status: user.status,
        passwordVerified: passwordMatches,
      },
    ],
    hint: 'POST /api/auth/login with the email + password above',
  };
}

async function runCli() {
  try {
    console.log('Seeding super admin credential...');
    const result = await seedSuperAdmin();
    console.log(JSON.stringify(result, null, 2));
    console.log('\n--- Super admin login ---');
    console.log(`${result.logins[0].email} / ${result.logins[0].password}`);
    process.exit(0);
  } catch (err) {
    console.error('seedSuperAdmin failed:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  runCli();
}

module.exports = { seedSuperAdmin, SUPER_ADMIN, ROLE_NAME };

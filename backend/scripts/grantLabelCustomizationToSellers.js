/**
 * Grant Label Customization (create/read/update) to every non-admin role
 * used by sellers in user_sellers, so all sellers can see the menu.
 *
 * Run: node scripts/grantLabelCustomizationToSellers.js
 */
require('dotenv').config();

const { Op } = require('sequelize');
const {
  Role,
  Permission,
  ModulePermission,
  User,
} = require('../models');
const sequelize = require('../config/database');

const MODULE = 'Label Customization';
const ACTIONS = ['create', 'read', 'update', 'delete'];

async function main() {
  await sequelize.authenticate();

  const permissions = [];
  for (const action of ACTIONS) {
    const [perm] = await Permission.findOrCreate({
      where: { module: MODULE, action },
      defaults: {
        name: `${action} ${MODULE}`,
        module: MODULE,
        action,
        description: `Can ${action} ${MODULE}`,
      },
    });
    permissions.push(perm);
  }

  const sellerRoleIds = await User.findAll({
    attributes: ['roleId'],
    group: ['roleId'],
    raw: true,
  }).then((rows) => rows.map((r) => r.roleId).filter(Boolean));

  const roles = await Role.findAll({
    where: {
      id: { [Op.in]: sellerRoleIds.length ? sellerRoleIds : [0] },
    },
  });

  // Always include named seller + admin roles
  const namedRoles = await Role.findAll({
    where: { name: { [Op.in]: ['seller', 'admin'] } },
  });

  const roleMap = new Map();
  for (const role of [...roles, ...namedRoles]) {
    roleMap.set(role.id, role);
  }

  let linksAdded = 0;
  const roleSummary = [];

  for (const role of roleMap.values()) {
    const isAdmin = String(role.name).toLowerCase() === 'admin';
    const actionsForRole = isAdmin ? ACTIONS : ['create', 'read', 'update'];
    let added = 0;

    for (const perm of permissions) {
      if (!actionsForRole.includes(perm.action)) continue;
      const [, created] = await ModulePermission.findOrCreate({
        where: { roleId: role.id, permissionId: perm.id },
        defaults: { roleId: role.id, permissionId: perm.id },
      });
      if (created) {
        added += 1;
        linksAdded += 1;
      }
    }

    roleSummary.push({
      roleId: role.id,
      name: role.name,
      linksAdded: added,
    });
  }

  console.log(
    JSON.stringify(
      {
        module: MODULE,
        rolesUpdated: roleSummary,
        totalLinksAdded: linksAdded,
        sellerRoleIds,
      },
      null,
      2
    )
  );

  await sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

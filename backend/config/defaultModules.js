/**
 * Canonical module list for default permissions.
 * Names align with sidebar titles in fontend_code/src/config/navigation.ts
 * so filterNavByPermissions can match module names to menu items.
 */

const ACTIONS = ['create', 'read', 'update', 'delete'];

/** All product modules that should exist in `permissions` by default */
const DEFAULT_MODULES = [
  // Top-level
  'Dashboard',
  'Orders',
  'NDR',
  'NDR/RTO',
  'Settings',
  'Label Customization',
  'Warehouse',

  // Billing
  'Billing',
  'Finance',
  'Finance & COD',
  'Wallet Recharge',
  'Subscription',
  'Subscriptions',
  'Disputes',
  'Credit & Exposure',

  // Tools
  'Tools',
  'Rate Calculator',
  'Couriers',
  'Sellers',
  'B2B',

  // Reports
  'Reports',
  'Shipment Report',
  'Risk & Fraud',

  // Integrations
  'Integrations',
  'Order Channels',
  'OMS',
  'EDD Widget',
  'API Integration',

  // Admin / Others
  'Others',
  'Roles',
  'Permissions',
  'Users',
  'Support',
  'Notifications',
  'Audit Logs',
  'System Monitor',
  'System',
];

/** Seller/default operational modules (no admin-only areas) */
const SELLER_DEFAULT_MODULES = [
  'Dashboard',
  'Orders',
  'NDR',
  'NDR/RTO',
  'Settings',
  'Label Customization',
  'Warehouse',
  'Billing',
  'Finance',
  'Finance & COD',
  'Wallet Recharge',
  'Subscription',
  'Subscriptions',
  'Disputes',
  'Credit & Exposure',
  'Tools',
  'Rate Calculator',
  'Couriers',
  'B2B',
  'Reports',
  'Shipment Report',
  'Integrations',
  'Order Channels',
  'OMS',
  'EDD Widget',
  'API Integration',
  'Support',
  'Notifications',
];

/** Admin-only modules (seller should not get these by default) */
const ADMIN_ONLY_MODULES = [
  'Sellers',
  'Roles',
  'Permissions',
  'Users',
  'Audit Logs',
  'System Monitor',
  'System',
  'Risk & Fraud',
  'Others',
];

/**
 * Build flat permission rows for seeding.
 * @returns {{ name: string, module: string, action: string, description: string }[]}
 */
function buildDefaultPermissionRows(modules = DEFAULT_MODULES) {
  const rows = [];
  for (const moduleName of modules) {
    for (const action of ACTIONS) {
      rows.push({
        name: `${action} ${moduleName}`,
        module: moduleName,
        action,
        description: `Can ${action} ${moduleName}`,
      });
    }
  }
  return rows;
}

module.exports = {
  ACTIONS,
  DEFAULT_MODULES,
  SELLER_DEFAULT_MODULES,
  ADMIN_ONLY_MODULES,
  buildDefaultPermissionRows,
};

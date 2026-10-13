const ORDER_VIEWER_ROLE = 'order_viewer';

function roleNameOf(userOrRole) {
  if (!userOrRole) return '';
  if (typeof userOrRole === 'string') return userOrRole.toLowerCase();
  return String(userOrRole?.role?.name || userOrRole?.name || userOrRole?.role || '').toLowerCase();
}

function isAdminRole(userOrRole) {
  const name = roleNameOf(userOrRole);
  return name === 'admin' || name === 'super admin';
}

function isOrderViewerRole(userOrRole) {
  const name = roleNameOf(userOrRole);
  return (
    name === ORDER_VIEWER_ROLE ||
    name === 'order viewer' ||
    name === 'viewer' ||
    name.endsWith('_viewer') ||
    (name.includes('viewer') && !isAdminRole(name))
  );
}

function canViewAllOrders(userOrRole) {
  return isAdminRole(userOrRole) || isOrderViewerRole(userOrRole);
}

module.exports = {
  ORDER_VIEWER_ROLE,
  roleNameOf,
  isAdminRole,
  isOrderViewerRole,
  canViewAllOrders,
};

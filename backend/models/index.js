const User = require('./User');
const UserSeller = require('./User');
const Role = require('./Role');
const Permission = require('./Permission');
const ModulePermission = require('./ModulePermission');
const Order = require('./Order');
const Pincode = require('./Pincode');

const OrderItem = require('./OrderItem');
const Ordertest = require('./Ordertest'); 

const Integration = require('./Integration');
const Shipment = require('./Shipment');
const Wallet = require('./Wallet');
const Warehouse = require('./Warehouse');
const B2bRateCard = require('./B2bRateCard');
const FreightConsignment = require('./FreightConsignment');
const Seller = require('./Seller');

User.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });
Wallet.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Role.hasMany(User, { foreignKey: 'roleId', as: 'users' });

Role.belongsToMany(Permission, {
  through: ModulePermission,
  foreignKey: 'roleId',
  otherKey: 'permissionId',
  as: 'permissions'
});

Permission.belongsToMany(Role, {
  through: ModulePermission,
  foreignKey: 'permissionId',
  otherKey: 'roleId',
  as: 'roles'
});

Order.hasMany(OrderItem, {
  foreignKey: 'orderId',
  as: 'items',
  onDelete: 'CASCADE'
});

OrderItem.belongsTo(Order, {
  foreignKey: 'orderId',
  as: 'order'
});

Integration.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'creator'
});

ModulePermission.belongsTo(Role, { foreignKey: 'roleId' });
ModulePermission.belongsTo(Permission, { foreignKey: 'permissionId' });

Warehouse.belongsTo(UserSeller, {
  foreignKey: 'user_id',
  as: 'seller'
});

UserSeller.hasMany(Warehouse, {
  foreignKey: 'user_id',
  as: 'warehouses'
});

FreightConsignment.belongsTo(UserSeller, {
  foreignKey: 'user_id',
  as: 'seller'
});

UserSeller.hasMany(FreightConsignment, {
  foreignKey: 'user_id',
  as: 'freightConsignments'
});

module.exports = {
  User,
  UserSeller,
  Role,
  Permission,
  ModulePermission,
  Order,
  OrderItem,
  Integration,
  Shipment,
  Wallet,
  Warehouse,
  Pincode,
  Ordertest,
  B2bRateCard,
  FreightConsignment,
  Seller,
};

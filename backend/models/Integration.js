
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Integration = sequelize.define('Integration', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
user_id: {
  type: DataTypes.INTEGER,
  allowNull: false, 
  references: {
    model: 'user_sellers', 
    key: 'id',
  },
},
  type: {
    type: DataTypes.ENUM('Amazon', 'Shopify', 'WooCommerce', 'Custom'),
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_active'
  },
  lastSync: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_sync'
  },
  credentials: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {}
  },
  settings: {
    type: DataTypes.JSONB,
    defaultValue: {},
    field: 'settings'
  },
  created_by: {
    type: DataTypes.INTEGER,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  }
}, {
  tableName: 'integrations',
  timestamps: true,
  underscored: true
});

module.exports = Integration;

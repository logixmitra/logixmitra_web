const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Warehouse = sequelize.define('Warehouse', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },

  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  isActive:{
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
isDefault:{
    type: DataTypes.BOOLEAN,
    defaultValue: false,
},
  address: {
    type: DataTypes.STRING(255),
    allowNull: false
  },

  city: {
    type: DataTypes.STRING(100),
    allowNull: false
  },

  state: {
    type: DataTypes.STRING(100),
    allowNull: false
  },

  pincode: {
    type: DataTypes.STRING(10),
    allowNull: false
  },

  contactPerson: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'contact_person'
  },

  phone: {
    type: DataTypes.STRING(15),
    allowNull: true,
    validate: {
      isNumeric: true
    }
  },

  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'user_sellers', // table name
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  },

  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },

  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'updated_at'
  }

}, {
  tableName: 'warehouses',
  timestamps: true
});

module.exports = Warehouse;

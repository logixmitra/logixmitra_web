const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Permission = sequelize.define('Permission', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  module: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  action: {
    type: DataTypes.ENUM('create', 'read', 'update', 'delete'),
    allowNull: false
  },
  description: {
    type: DataTypes.STRING(255)
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
  tableName: 'permissions',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['module', 'action']
    }
  ]
});

module.exports = Permission;

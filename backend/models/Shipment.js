const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Shipment = sequelize.define('Shipment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  orderNumber: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  referenceId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  shipmentjson: {
    type: DataTypes.JSON,
    allowNull: true
  },
   shipmenttracking: {
    type: DataTypes.JSON,
    allowNull: true
  }
},

{
  timestamps: true,
  tableName: 'shipment'
});

module.exports = Shipment;     

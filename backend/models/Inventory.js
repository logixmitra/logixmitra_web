const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Inventory = sequelize.define('Inventory', {

  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },

  Serial_Number: {
    type: DataTypes.STRING,
    allowNull: false
  },

  Item: {
    type: DataTypes.STRING,
    allowNull: false
  },

  Stock_Item_Name: {
    type: DataTypes.STRING,
    allowNull: false
  },

  Batch_Serial_tracking_enabled: {
    type: DataTypes.STRING,
    allowNull: true
  },


  Dealer_Code: {
    type: DataTypes.STRING,
    allowNull: true
  },

  Invoice_Number: {
    type: DataTypes.STRING,
    allowNull: false
  },

  Invoice_Date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  }

}, {
  timestamps: true,
  tableName: 'inventory'
});

module.exports = Inventory;

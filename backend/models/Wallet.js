const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Wallet= sequelize.define('Wallet', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
   references: {
    model: 'user_sellers',
    key: 'id',
  },
  },
  transid: {
    type: DataTypes.STRING(255),
      allowNull: true,

  },
   orderNumber: {
    type: DataTypes.STRING(255),
      allowNull: true,

  },

  referenceId:{
    type: DataTypes.STRING(255),
      allowNull: true,
  },
  amount: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
status: {        
  type: DataTypes.STRING,
  allowNull: false,
  defaultValue: "draft"
},
rto:{        
  type: DataTypes.STRING,
  allowNull: false,
  defaultValue: "" 
},


description: {
  type: DataTypes.STRING,
  allowNull: true,
  defaultValue: null
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
  tableName: 'wallet',
  timestamps: true
});

module.exports = Wallet;

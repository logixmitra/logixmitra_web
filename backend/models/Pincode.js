const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Pincode = sequelize.define('Pincode', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  courier_name:{
    type: DataTypes.STRING,
    defaultValue: '',
    allowNull: true
  },
   data:{
    type: DataTypes.JSON,
    allowNull: true
  },
   pincodedate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  }
},
{
  timestamps: true,
  tableName: 'pincode'
});
module.exports = Pincode;

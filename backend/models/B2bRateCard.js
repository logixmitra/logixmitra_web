const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Admin-managed B2B rate cards (no live courier API).
 * slabs JSON shape:
 * {
 *   "ZONE A": { minCharge, perKg, codPercent, odaSurcharge },
 *   ...
 * }
 */
const B2bRateCard = sequelize.define('B2bRateCard', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  courierName: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Display label only (e.g. Delhivery B2B)',
  },
  mode: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'MPS',
    comment: 'MPS | LTL | PTL | FTL | AIR',
  },
  slabs: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {},
  },
  volumetricDivisor: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5000,
  },
  gstPercent: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 18,
  },
  minWeightKg: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  effectiveFrom: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  timestamps: true,
  tableName: 'b2b_rate_cards',
});

module.exports = B2bRateCard;

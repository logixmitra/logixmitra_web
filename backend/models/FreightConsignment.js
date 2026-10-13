const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Phase 2 B2B freight consignments (LTL / PTL / FTL / Air).
 * Manual LR/AWB booking; live freight APIs later.
 */
const FreightConsignment = sequelize.define('FreightConsignment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'user_sellers',
      key: 'id',
    },
  },
  orderId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Optional link to orders row when mirrored',
  },
  referenceId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  freightMode: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'LTL',
    comment: 'LTL | PTL | FTL | AIR',
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Pending',
  },
  courierName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  lrNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Manual LR / AWB',
  },
  warehouseId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  originPincode: {
    type: DataTypes.STRING(10),
    allowNull: true,
  },
  destPincode: {
    type: DataTypes.STRING(10),
    allowNull: true,
  },
  consigneeName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  consigneePhone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  consigneeGstin: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  consigneeAddress: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  packages: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  chargeableWeight: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  invoiceValue: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  paymentMode: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'PREPAID',
  },
  billingParty: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  quotedCharge: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  rateCardId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  ewayBill: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  pickupType: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'on_demand',
    comment: 'on_demand | scheduled',
  },
  pickupScheduledAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  pickupStatus: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'pending',
  },
  appointmentAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  epodUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  manualBooking: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  zone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  timestamps: true,
  tableName: 'freight_consignments',
});

module.exports = FreightConsignment;

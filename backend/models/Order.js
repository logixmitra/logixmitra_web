const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
   user_id: {
  type: DataTypes.INTEGER,
  allowNull: true,
  references: {
    model: 'user_sellers',
    key: 'id',
  },
},
  orderNumber: {
    type: DataTypes.STRING,
    allowNull: true,
  
  },
  referenceId: {
    type: DataTypes.STRING,
    allowNull: true,
  },


deliveredDate: {
  type: DataTypes.DATEONLY,
  allowNull: true,
},
deliveredTime: {
  type: DataTypes.TIME,
  allowNull: true,
},


  customerName: {
    type: DataTypes.STRING,
    allowNull: true
  },

    zone: {
    type: DataTypes.STRING,
    allowNull: true
  },


  chargecor: {
    type: DataTypes.STRING,
    allowNull: true
  },

  // Reverse freight + GST (no COD) computed at shipment booking for auto RTO debit
  rtoCharge: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: null,
  },
    codcharge: {
    type: DataTypes.STRING,    
    allowNull: true,
    defaultValue: null,
  },
  rtoCharged: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },

  customerPhone: {
    type: DataTypes.STRING,
    allowNull: true
  },



/*  customerEmail: {
    type: DataTypes.STRING,
allowNull: true,  
  validate: {
      isEmail: true
    }
  },*/



customerEmail: {
  type: DataTypes.STRING,
  allowNull: true,
  validate: {
    isEmail: true
  },
  set(value) {
    this.setDataValue('customerEmail', value === '' ? null : value);
  }
},




  seller: {
    type: DataTypes.STRING,
    allowNull: true
  },





  courier: {
    type: DataTypes.STRING,
    defaultValue: '-'
  },
  status: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Pending'
  },





  amount: {
    type: DataTypes.STRING,
    allowNull: true
  },


   warehouse: {
    type: DataTypes.STRING, 
    allowNull: true
  },




  orderDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },

  awb: {
    type: DataTypes.STRING,
    defaultValue: '-'
  },

  codpaidstatus: {
    type: DataTypes.STRING,
    defaultValue: 'Pending'
  }, 

  platform: {
    type: DataTypes.ENUM('Manual', 'Amazon', 'Shopify', 'WooCommerce', 'Custom','Merged'),
    defaultValue: 'Manual'
  },



  // Address fields
  pincode: {
    type: DataTypes.STRING(10),
    allowNull: true
  },



  city: {
    type: DataTypes.STRING,
    allowNull: true
  },
  state: {
    type: DataTypes.STRING,
    allowNull: true
  },
  addressLine1: {
    type: DataTypes.STRING,
    allowNull: true
  },
  addressLine2: {
    type: DataTypes.STRING
  },

  landmark: {
    type: DataTypes.STRING
  },



  
  // Calculated fields
  totalItems: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  totalWeight: {
    type: DataTypes.FLOAT
  },
  totalVolumetricWeight: {
    type: DataTypes.FLOAT
  }
,

shopifyOrderId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Original Shopify order ID'
  },
  financialStatus: {
    type: DataTypes.ENUM('paid', 'partially_paid', 'pending', 'refunded', 'voided'),
    defaultValue: 'paid'
  },
  fulfillmentStatus: {
    type: DataTypes.ENUM('fulfilled', 'partial', 'pending', 'restocked', 'null'),
    allowNull: true
  },
  paymentGateway: {
    type: DataTypes.STRING,
    defaultValue: 'Prepaid'
  },

  dispute_status: {
    type: DataTypes.STRING,
    defaultValue: '',
    allowNull: true
  },

  dispute_reason:{
    type: DataTypes.STRING,
    defaultValue: '',
    allowNull: true
  },

  merge_status:{
    type: DataTypes.STRING,
    defaultValue: '',
    allowNull: true
  },

   merge_order:{
    type: DataTypes.JSON,
    allowNull: true
  },

   dispute_file_: {
    type: DataTypes.STRING,
    defaultValue: '',
    allowNull: true
  },





   dispute_file: {
    type: DataTypes.TEXT,
    defaultValue: '',
    allowNull: true
  },

   previousweight:{
    type: DataTypes.STRING,
    defaultValue: '',
    allowNull: true
  },
   dispute_created_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
   claimweight:{
    type: DataTypes.STRING,
    defaultValue: '',
    allowNull: true
  },


  
  // Financial fields
  subtotalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: { min: 0 }
  },
  totalTax: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  totalDiscounts: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  // Shopify / manual discount codes metadata e.g. [{ code, amount, type }]
  discountCodes: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    field: 'discount_codes'
  },
  totalShippingPrice: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  totalOutstanding: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  // Extra COD fee charged by seller on Shopify (shipping line / fee app / note)
  codCharge: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'cod_charge'
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'INR'
  },
  taxesIncluded: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  taxExempt: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  // Tracking & source fields
  confirmationNumber: {
    type: DataTypes.STRING
  },
  checkoutId: {
    type: DataTypes.BIGINT
  },
  checkoutToken: {
    type: DataTypes.STRING
  },
  orderStatusUrl: {
    type: DataTypes.TEXT
  },
  sourceName: {
    type: DataTypes.STRING,
    comment: 'shopify_draft_order, web, etc.'
  },
  
  // Customer context
  browserIp: {
    type: DataTypes.STRING(45)
  },
  userAgent: {
    type: DataTypes.TEXT
  },
  
  // Addresses as JSON (or create separate tables)
  shippingAddress: {
    type: DataTypes.JSON,
    allowNull: true
  },
  tracking_history: {
    type: DataTypes.JSON,
    allowNull: true
  },
  billingAddress: {
    type: DataTypes.JSON,
    allowNull: true
  },
  customerData: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Complete customer object from Shopify,woocomerce'
  },
  
  // Timestamps
  processedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cancelledAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cancelReason: {
    type: DataTypes.STRING,
    allowNull: true
  },
  trackingnumber: {
    type: DataTypes.STRING,
    allowNull: true
  },


  ndrreason: {
    type: DataTypes.STRING,
    defaultValue: '',
  },

  // B2B / multi-package fields
  orderType: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'B2C',
    comment: 'B2C | B2B_MPS | B2B_FREIGHT',
  },
  packages: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Multi-box packages: [{ boxNo, length, width, height, deadWeight, volumetricWeight }]',
  },
  billingParty: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'shipper | consignee (required when To-Pay)',
  },
  b2bCharge: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: null,
    comment: 'Quoted B2B freight (ex-GST) from rate card',
  },
  b2bRateCardId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  manualBooking: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'True when AWB was entered manually (B2B Phase 1)',
  },
  consigneeGstin: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  ewayBill: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  appointmentAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  epodUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  rovType: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Rov Owner | Rov Carrier (Delhivery B2B LTL)',
  },
  freightMode: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'LTL | PTL | FTL | AIR (B2B freight)',
  },
  alternatePhone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  customerId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  sellerOrderId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  orderTags: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
  addressType: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Home',
  },
  country: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'India',
  },
  packageType: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Box',
  },
  packageCount: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1,
  },
  shippingMode: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Surface',
  },
  courierService: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  expectedDeliveryDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },





  




},

{
  timestamps: true,
  tableName: 'orders',
  indexes: [
    {
      // Named unique index so sync({ alter: true }) doesn't
      // create a fresh duplicate constraint on every restart.
      name: 'orders_referenceId_key',
      unique: true,
      fields: ['referenceId'],
    },
  ],
});

module.exports = Order;

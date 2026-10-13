const { DataTypes } = require('sequelize');
const sequelize = require('../config/databasetest');

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
    defaultValue: 'pending'
  },
  fulfillmentStatus: {
    type: DataTypes.ENUM('fulfilled', 'partial', 'pending', 'restocked', 'null'),
    allowNull: true
  },
  paymentGateway: {
    type: DataTypes.STRING,
    defaultValue: 'manual'
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
    type: DataTypes.STRING,
    defaultValue: '',
    allowNull: true
  },

   previousweight:{
    type: DataTypes.STRING,
    defaultValue: '',
    allowNull: true
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
  totalShippingPrice: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  totalOutstanding: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
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





  




},

{
  timestamps: true,
  tableName: 'orders'
});

module.exports = Order;

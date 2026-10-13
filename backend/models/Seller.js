

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const Seller = sequelize.define('Seller', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },






  name: {
    type: DataTypes.STRING,
    allowNull: false
  },

  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },

  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },

  roleId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'role_id',
    references: {
      model: 'roles',
      key: 'id'
    }
  },

  company: {
    type: DataTypes.STRING,
    allowNull: false
  },

  phone: {
    type: DataTypes.STRING,
    allowNull: false
  },

  gst: {
    type: DataTypes.STRING,
    defaultValue: '-'
  },

  status: {
    type: DataTypes.ENUM('active', 'blocked', 'pending'),
    defaultValue: 'pending'
  },

  kycStatus: {
    type: DataTypes.ENUM('verified', 'pending', 'rejected'),
    defaultValue: 'pending'
  },

  totalOrders: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },

  revenue: {
    type: DataTypes.STRING,
    defaultValue: '₹0'
  },

  joinedAt: {
    type: DataTypes.DATEONLY,
    defaultValue: DataTypes.NOW
  },

  address: {
    type: DataTypes.STRING,
    allowNull: false
  },

  walletBalance: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },

  performanceScore: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },

  rtoRate: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },

  riskCategory: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    defaultValue: 'low'
  },

  subscription: {
    type: DataTypes.ENUM('Trial', 'Starter', 'Growth', 'Enterprise'),
    defaultValue: 'Trial'
  }

}, {
  timestamps: true,
  tableName: 'sellers',

  hooks: {
    // Hash exactly ONCE — skip when already a bcrypt hash (see User.js).
    // Prevents hash(hash(password)) which could never be matched at login.
    beforeCreate: async (seller) => {
      if (seller.password && !/^\$2[abxy]?\$\d\d\$/.test(String(seller.password))) {
        seller.password = await bcrypt.hash(seller.password, 10);
      }
    },
    beforeUpdate: async (seller) => {
      if (seller.changed('password') && !/^\$2[abxy]?\$\d\d\$/.test(String(seller.password))) {
        seller.password = await bcrypt.hash(seller.password, 10);
      }
    }
  }
});

// 🔹 Compare password method
Seller.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = Seller;

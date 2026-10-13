


const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {

  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },

  // 🔹 Common Fields
  name: {
    type: DataTypes.STRING,
    allowNull: true
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
 pincode: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
   city: {
    type: DataTypes.STRING(255),
    allowNull: true
  }, state: {
    type: DataTypes.STRING(255),
    allowNull: true
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

  // 🔹 User Fields
  mobile: {
    type: DataTypes.STRING(255),
    allowNull: true
  },

  avatar: {
    type: DataTypes.STRING(10),
    defaultValue: 'U'
  },

  // Uploaded profile photo (stored as uploaded filename, e.g. "1728-456.jpg",
  // served from /uploads/<filename>). Falls back to `avatar` initials when empty.
  avatarUrl: {
    type: DataTypes.STRING(500),
    allowNull: true
  },

  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },

  lastLogin: {
    type: DataTypes.DATE,
    field: 'last_login'
  },

  // 🔹 Seller Fields
  company: {
    type: DataTypes.STRING,
    allowNull: false
  },

  phone: {
    type: DataTypes.STRING,
    allowNull: false
  },
   ratechart: {
    type: DataTypes.JSON,
    allowNull: true
  },

  // Seller-wise shipping label customization
  labelSettings: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    field: 'label_settings'
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
  },

  // 🔹 Timestamps
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
  tableName: 'user_sellers',
  timestamps: true,

  hooks: {
    // Hash exactly ONCE. Some callers pre-hash (bcrypt.hash) before create/
    // update — hashing again would store hash(hash(password)) and no login /
    // verify could ever match it. Skip when the value is already a bcrypt hash.
    beforeCreate: async (data) => {
      if (data.password && !/^\$2[abxy]?\$\d\d\$/.test(String(data.password))) {
        data.password = await bcrypt.hash(data.password, 10);
      }
    },
    beforeUpdate: async (data) => {
      if (data.changed('password') && !/^\$2[abxy]?\$\d\d\$/.test(String(data.password))) {
        data.password = await bcrypt.hash(data.password, 10);
      }
    }
  }
});

// 🔹 Instance method
User.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// 🔹 Class method
User.findByEmail = async function(email) {
  return await this.findOne({
    where: { email },
    include: ['role']
  });
};

module.exports = User;

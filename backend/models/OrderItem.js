const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OrderItem = sequelize.define('OrderItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  orderId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'orders',
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  sku: {
    type: DataTypes.STRING,
    allowNull: true
  },
  hsnCode: {
    type: DataTypes.STRING,
    allowNull: true
  },
  unitPrice: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: {
      min: 0
    }
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1
    }
  },
  gstRate: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    }
  },
  discount: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    allowNull: true,
  },
  totalPrice: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  // Dimensions (in cm)
  height: {
    type: DataTypes.FLOAT,
    validate: {
      min: 0
    }
  },
  width: {
    type: DataTypes.FLOAT,
    validate: {
      min: 0
    }
  },
  length: {
    type: DataTypes.FLOAT,
    validate: {
      min: 0
    }
  },
  deadWeight: {
    type: DataTypes.FLOAT,
    validate: {
      min: 0
    }
  },
  volumetricWeight: {
    type: DataTypes.FLOAT
  }
}, {
  timestamps: true,
  tableName: 'order_items'
});

module.exports = OrderItem;

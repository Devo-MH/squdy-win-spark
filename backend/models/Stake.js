const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Stake = sequelize.define('Stake', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  campaignId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'campaigns',
      key: 'id',
    },
  },
  amount: {
    type: DataTypes.DECIMAL(18, 8),
    allowNull: false,
    validate: {
      min: 0,
    },
  },
  tickets: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  transactionHash: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isTransactionHash(value) {
        if (value && !/^0x[a-fA-F0-9]{64}$/.test(value)) {
          throw new Error('Invalid transaction hash');
        }
      },
    },
  },
  blockNumber: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'failed'),
    allowNull: false,
    defaultValue: 'pending',
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },
}, {
  tableName: 'stakes',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['userId', 'campaignId'],
    },
    {
      fields: ['campaignId'],
    },
    {
      fields: ['transactionHash'],
    },
    {
      fields: ['status'],
    },
  ],
});

module.exports = Stake;
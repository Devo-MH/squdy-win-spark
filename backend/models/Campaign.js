const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Campaign = sequelize.define('Campaign', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [3, 255],
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isUrl: true,
    },
  },
  targetAmount: {
    type: DataTypes.DECIMAL(20, 2),
    allowNull: false,
    defaultValue: 0,
  },
  currentAmount: {
    type: DataTypes.DECIMAL(20, 2),
    allowNull: false,
    defaultValue: 0,
  },
  maxParticipants: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  participantCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  ticketAmount: {
    type: DataTypes.DECIMAL(18, 8),
    allowNull: false,
    defaultValue: 100,
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      isAfterStart(value) {
        if (value <= this.startDate) {
          throw new Error('End date must be after start date');
        }
      },
    },
  },
  status: {
    type: DataTypes.ENUM('draft', 'active', 'finished', 'winners_selected', 'cancelled'),
    allowNull: false,
    defaultValue: 'draft',
  },
  contractAddress: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEthereumAddress(value) {
        if (value && !/^0x[a-fA-F0-9]{40}$/.test(value)) {
          throw new Error('Invalid Ethereum address');
        }
      },
    },
  },
  prizes: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  offchainTasks: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  winners: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
}, {
  tableName: 'campaigns',
  timestamps: true,
  indexes: [
    {
      fields: ['status'],
    },
    {
      fields: ['startDate', 'endDate'],
    },
    {
      fields: ['createdBy'],
    },
    {
      fields: ['contractAddress'],
    },
  ],
});

module.exports = Campaign;
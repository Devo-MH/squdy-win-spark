const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  walletAddress: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEthereumAddress(value) {
        if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
          throw new Error('Invalid Ethereum address');
        }
      },
    },
  },
  username: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  profileImage: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  socialProfiles: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },
  preferences: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },
}, {
  tableName: 'users',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['walletAddress'],
    },
    {
      fields: ['email'],
    },
    {
      fields: ['username'],
    },
  ],
});

module.exports = User;
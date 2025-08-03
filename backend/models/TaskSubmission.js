const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TaskSubmission = sequelize.define('TaskSubmission', {
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
  taskId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  taskType: {
    type: DataTypes.ENUM(
      'twitter_follow',
      'twitter_retweet',
      'twitter_like',
      'discord_join',
      'telegram_join',
      'email_subscribe',
      'website_visit',
      'custom'
    ),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'verified', 'failed', 'rejected'),
    allowNull: false,
    defaultValue: 'pending',
  },
  submissionData: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },
  verificationData: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },
  verifiedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  verifiedBy: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },
}, {
  tableName: 'task_submissions',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['userId', 'campaignId', 'taskId'],
    },
    {
      fields: ['campaignId', 'taskType'],
    },
    {
      fields: ['status'],
    },
    {
      fields: ['verifiedAt'],
    },
  ],
});

module.exports = TaskSubmission;
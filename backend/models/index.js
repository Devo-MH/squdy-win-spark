const sequelize = require('../config/database');
const User = require('./User');
const Campaign = require('./Campaign');
const Stake = require('./Stake');
const TaskSubmission = require('./TaskSubmission');

// Define associations
User.hasMany(Campaign, { foreignKey: 'createdBy', as: 'createdCampaigns' });
Campaign.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

User.hasMany(Stake, { foreignKey: 'userId', as: 'stakes' });
Stake.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Campaign.hasMany(Stake, { foreignKey: 'campaignId', as: 'stakes' });
Stake.belongsTo(Campaign, { foreignKey: 'campaignId', as: 'campaign' });

User.hasMany(TaskSubmission, { foreignKey: 'userId', as: 'taskSubmissions' });
TaskSubmission.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Campaign.hasMany(TaskSubmission, { foreignKey: 'campaignId', as: 'taskSubmissions' });
TaskSubmission.belongsTo(Campaign, { foreignKey: 'campaignId', as: 'campaign' });

module.exports = {
  sequelize,
  User,
  Campaign,
  Stake,
  TaskSubmission,
};
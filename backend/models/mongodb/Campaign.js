const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  contractId: {
    type: Number,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  imageUrl: String,
  status: {
    type: String,
    enum: ['active', 'finished', 'winners_selected', 'burned'],
    default: 'active'
  },
  currentAmount: {
    type: Number,
    default: 0
  },
  hardCap: {
    type: Number,
    required: true
  },
  ticketAmount: {
    type: Number,
    required: true
  },
  participantCount: {
    type: Number,
    default: 0
  },
  winners: [{
    address: String,
    amount: Number,
    rank: Number
  }],
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  offchainTasks: [{
    id: String,
    type: {
      type: String,
      enum: ['twitter_follow', 'twitter_retweet', 'telegram_join', 'discord_join', 'email_subscribe', 'website_visit']
    },
    label: String,
    description: String,
    required: Boolean,
    targetAccount: String,
    verificationEndpoint: String,
    reward: Number
  }],
  createdBy: String,
  burnedTokens: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Campaign', campaignSchema);
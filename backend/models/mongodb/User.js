const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  email: String,
  username: String,
  participatedCampaigns: [{
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign'
    },
    stakeAmount: Number,
    joinedAt: {
      type: Date,
      default: Date.now
    },
    socialTasks: [{
      taskId: String,
      completed: Boolean,
      completedAt: Date,
      proof: String
    }]
  }],
  totalStaked: {
    type: Number,
    default: 0
  },
  totalWon: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
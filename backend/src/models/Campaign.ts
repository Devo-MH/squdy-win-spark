import mongoose, { Document, Schema } from 'mongoose';

export interface Prize {
  name: string;
  description: string;
  value: number;
  currency: 'USD' | 'SQUDY' | 'BNB';
  quantity: number;
}

export interface SocialRequirements {
  twitter?: {
    followAccount?: string;
    likePostId?: string;
    retweetPostId?: string;
  };
  discord?: {
    serverId?: string;
    inviteLink?: string;
  };
  telegram?: {
    groupId?: string;
    inviteLink?: string;
  };
  medium?: {
    profileUrl?: string;
  };
  newsletter?: {
    endpoint?: string;
  };
}

export interface Winner {
  walletAddress: string;
  prizeIndex: number;
  prizeName: string;
}

export interface ICampaign extends Document {
  contractId: number;
  name: string;
  description: string;
  imageUrl: string;
  softCap: number;
  hardCap: number;
  ticketAmount: number;
  startDate: Date;
  endDate: Date;
  prizes: Prize[];
  socialRequirements: SocialRequirements;
  status: 'pending' | 'active' | 'paused' | 'finished' | 'burned';
  currentAmount: number;
  participantCount: number;
  winners: Winner[];
  totalBurned: number;
  winnerSelectionTx?: string;
  burnTx?: string;
  bscScanUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Virtual properties
  daysLeft?: number;
  progressPercentage?: number;
}

const CampaignSchema = new Schema<ICampaign>({
  contractId: {
    type: Number,
    required: true,
    unique: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String,
    required: true,
  },
  softCap: {
    type: Number,
    required: true,
    min: 0,
  },
  hardCap: {
    type: Number,
    required: true,
    min: 0,
  },
  ticketAmount: {
    type: Number,
    required: true,
    min: 1,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  prizes: [{
    name: { type: String, required: true },
    description: { type: String, required: true },
    value: { type: Number, required: true },
    currency: { type: String, enum: ['USD', 'SQUDY', 'BNB'], required: true },
    quantity: { type: Number, required: true, default: 1 },
  }],
  socialRequirements: {
    twitter: {
      followAccount: { type: String, default: '' },
      likePostId: { type: String, default: '' },
      retweetPostId: { type: String, default: '' },
    },
    discord: {
      serverId: { type: String, default: '' },
      inviteLink: { type: String, default: '' },
    },
    telegram: {
      groupId: { type: String, default: '' },
      inviteLink: { type: String, default: '' },
    },
    medium: {
      profileUrl: { type: String, default: '' },
    },
    newsletter: {
      endpoint: { type: String, default: '' },
    },
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'paused', 'finished', 'burned'],
    default: 'pending',
    required: true,
    index: true,
  },
  currentAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  participantCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  winners: [{
    walletAddress: { type: String },
    prizeIndex: { type: Number },
    prizeName: { type: String },
  }],
  totalBurned: {
    type: Number,
    default: 0,
    min: 0,
  },
  winnerSelectionTx: {
    type: String,
    default: '',
  },
  burnTx: {
    type: String,
    default: '',
  },
  bscScanUrl: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
});

// Indexes for query performance
CampaignSchema.index({ status: 1, endDate: -1 });
CampaignSchema.index({ startDate: 1 });

// Virtual for calculating days left
CampaignSchema.virtual('daysLeft').get(function() {
  if (this.status !== 'active') {
    return 0;
  }
  const now = new Date();
  const diff = this.endDate.getTime() - now.getTime();
  if (diff <= 0) {
    return 0;
  }
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Virtual for calculating progress percentage
CampaignSchema.virtual('progressPercentage').get(function() {
  if (this.hardCap === 0) {
    return 0;
  }
  const percentage = (this.currentAmount / this.hardCap) * 100;
  return Math.min(percentage, 100);
});

// Ensure virtuals are serialized
CampaignSchema.set('toJSON', { virtuals: true });
CampaignSchema.set('toObject', { virtuals: true });

export default mongoose.model<ICampaign>('Campaign', CampaignSchema);
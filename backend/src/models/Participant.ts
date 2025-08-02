import mongoose, { Document, Schema } from 'mongoose';

export interface IParticipant extends Document {
  walletAddress: string;
  campaignId: mongoose.Types.ObjectId;
  socialTasksCompleted: {
    twitterFollow: boolean;
    twitterLike: boolean;
    twitterRetweet: boolean;
    discordJoined: boolean;
    telegramJoined: boolean;
    mediumFollowed: boolean;
    newsletterSubscribed: boolean;
    emailAddress: string;
  };
  stakeTxHash: string;
  ticketCount: number;
  stakedAmount: number;
  isWinner: boolean;
  prizeIndex: number;
  prizeName: string;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Virtual properties
  allSocialTasksCompleted?: boolean;
  socialCompletionPercentage?: number;
}

const ParticipantSchema = new Schema<IParticipant>({
  walletAddress: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  campaignId: {
    type: Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true,
  },
  socialTasksCompleted: {
    twitterFollow: {
      type: Boolean,
      default: false,
    },
    twitterLike: {
      type: Boolean,
      default: false,
    },
    twitterRetweet: {
      type: Boolean,
      default: false,
    },
    discordJoined: {
      type: Boolean,
      default: false,
    },
    telegramJoined: {
      type: Boolean,
      default: false,
    },
    mediumFollowed: {
      type: Boolean,
      default: false,
    },
    newsletterSubscribed: {
      type: Boolean,
      default: false,
    },
    emailAddress: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },
  },
  stakeTxHash: {
    type: String,
    required: true,
    unique: true,
  },
  ticketCount: {
    type: Number,
    required: true,
    min: 1,
  },
  stakedAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  isWinner: {
    type: Boolean,
    default: false,
  },
  prizeIndex: {
    type: Number,
    default: -1,
  },
  prizeName: {
    type: String,
    default: '',
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Indexes for better query performance
ParticipantSchema.index({ walletAddress: 1, campaignId: 1 }, { unique: true });
ParticipantSchema.index({ campaignId: 1, isWinner: 1 });
ParticipantSchema.index({ stakeTxHash: 1 }, { unique: true });
ParticipantSchema.index({ joinedAt: -1 });

// Virtual for checking if all social tasks are completed
ParticipantSchema.virtual('allSocialTasksCompleted').get(function() {
  const tasks = this.socialTasksCompleted;
  return (
    tasks.twitterFollow &&
    tasks.twitterLike &&
    tasks.twitterRetweet &&
    tasks.discordJoined &&
    tasks.telegramJoined &&
    tasks.mediumFollowed &&
    tasks.newsletterSubscribed
  );
});

// Virtual for calculating completion percentage
ParticipantSchema.virtual('socialCompletionPercentage').get(function() {
  const tasks = this.socialTasksCompleted;
  const totalTasks = 7; // Total number of social tasks
  let completedTasks = 0;

  if (tasks.twitterFollow) completedTasks++;
  if (tasks.twitterLike) completedTasks++;
  if (tasks.twitterRetweet) completedTasks++;
  if (tasks.discordJoined) completedTasks++;
  if (tasks.telegramJoined) completedTasks++;
  if (tasks.mediumFollowed) completedTasks++;
  if (tasks.newsletterSubscribed) completedTasks++;

  return Math.round((completedTasks / totalTasks) * 100);
});

// Ensure virtuals are serialized
ParticipantSchema.set('toJSON', { virtuals: true });
ParticipantSchema.set('toObject', { virtuals: true });

export default mongoose.model<IParticipant>('Participant', ParticipantSchema);
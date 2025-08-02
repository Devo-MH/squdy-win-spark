import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../app';
import Campaign from '../models/Campaign';
import Participant from '../models/Participant';

let mongoServer: MongoMemoryServer;

export const setupTestDB = async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  await mongoose.connect(mongoUri);
};

export const teardownTestDB = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
};

export const clearTestDB = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
};

export const createTestApp = () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.BCRYPT_ROUNDS = '4'; // Faster for testing
  process.env.ADMIN_WALLETS = '0x123456789012345678901234567890123456789a,0x123456789012345678901234567890123456789b';
  
  return createApp();
};

export const createTestCampaign = async (overrides: any = {}) => {
  const campaignData = {
    contractId: 1,
    name: 'Test Campaign',
    description: 'A test campaign for unit testing',
    imageUrl: 'https://example.com/test.jpg',
    softCap: 10000,
    hardCap: 100000,
    ticketAmount: 100,
    startDate: new Date(Date.now() + 100000), // Future start
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days later
    prizes: [
      { name: 'First Prize', description: 'Main prize', value: 1000, currency: 'USD', quantity: 1 },
      { name: 'Second Prize', description: 'Runner up', value: 500, currency: 'USD', quantity: 1 }
    ],
    socialRequirements: {
      twitter: { followAccount: '@TestToken', likePostId: '123', retweetPostId: '456' },
      discord: { serverId: '789', inviteLink: 'discord.gg/test' },
      telegram: { groupId: '101112', inviteLink: 't.me/test' },
      medium: { profileUrl: 'medium.com/@test' },
      newsletter: { endpoint: 'test.com/newsletter' }
    },
    status: 'pending',
    currentAmount: 0,
    participantCount: 0,
    winners: [],
    totalBurned: 0,
    ...overrides
  };

  const campaign = new Campaign(campaignData);
  return await campaign.save();
};

export const createTestParticipant = async (campaignId: any, overrides: any = {}) => {
  const participantData = {
    walletAddress: '0x1234567890123456789012345678901234567890',
    campaignId,
    socialTasksCompleted: {
      twitterFollow: false,
      twitterLike: false,
      twitterRetweet: false,
      discordJoined: false,
      telegramJoined: false,
      mediumFollowed: false,
      newsletterSubscribed: false,
      emailAddress: 'test@example.com'
    },
    stakeTxHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    ticketCount: 1,
    stakedAmount: 100,
    isWinner: false,
    prizeIndex: -1,
    prizeName: '',
    joinedAt: new Date(),
    ...overrides
  };

  const participant = new Participant(participantData);
  return await participant.save();
};

export const mockWeb3Service = {
  validateWalletSignature: jest.fn().mockResolvedValue(true),
  getCampaign: jest.fn().mockResolvedValue({
    currentAmount: 0,
    participantCount: 0,
    status: 'pending',
    winners: [],
    totalBurned: 0
  }),
  getParticipant: jest.fn().mockResolvedValue({
    isWinner: false,
    prizeIndex: -1
  }),
  getTokenBalance: jest.fn().mockResolvedValue('10000'),
  getTokenAllowance: jest.fn().mockResolvedValue('0')
};

// Mock authentication middleware
export const mockAuth = (walletAddress?: string, isAdmin = false) => {
  return (req: any, res: any, next: any) => {
    if (walletAddress) {
      req.walletAddress = walletAddress.toLowerCase();
    }
    if (isAdmin) {
      // Mock admin check
      const adminWallets = process.env.ADMIN_WALLETS?.split(',') || [];
      if (!adminWallets.includes(req.walletAddress)) {
        return res.status(403).json({ error: { message: 'Admin access required', statusCode: 403 } });
      }
    }
    next();
  };
};
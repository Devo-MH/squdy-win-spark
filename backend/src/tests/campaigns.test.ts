import request from 'supertest';
import { Application } from 'express';
import { setupTestDB, teardownTestDB, clearTestDB, createTestApp, createTestCampaign, createTestParticipant, mockAuth } from './setup';
import Campaign from '../models/Campaign';
import Participant from '../models/Participant';

describe('Campaign API Tests', () => {
  let app: Application;
  let testCampaign: any;

  beforeAll(async () => {
    await setupTestDB();
    app = createTestApp();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    testCampaign = await createTestCampaign();
  });

  describe('GET /api/campaigns', () => {
    it('should return all campaigns with pagination', async () => {
      // Create additional campaigns
      await createTestCampaign({ contractId: 2, name: 'Campaign 2' });
      await createTestCampaign({ contractId: 3, name: 'Campaign 3' });

      const response = await request(app)
        .get('/api/campaigns')
        .expect(200);

      expect(response.body.campaigns).toHaveLength(3);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 10,
        total: 3,
        totalPages: 1
      });
    });

    it('should filter campaigns by status', async () => {
      await createTestCampaign({ contractId: 2, name: 'Active Campaign', status: 'active' });
      await createTestCampaign({ contractId: 3, name: 'Finished Campaign', status: 'finished' });

      const response = await request(app)
        .get('/api/campaigns?status=active')
        .expect(200);

      expect(response.body.campaigns).toHaveLength(1);
      expect(response.body.campaigns[0].status).toBe('active');
    });

    it('should handle pagination correctly', async () => {
      // Create 15 campaigns
      for (let i = 2; i <= 16; i++) {
        await createTestCampaign({ contractId: i, name: `Campaign ${i}` });
      }

      const response = await request(app)
        .get('/api/campaigns?page=2&limit=5')
        .expect(200);

      expect(response.body.campaigns).toHaveLength(5);
      expect(response.body.pagination).toMatchObject({
        page: 2,
        limit: 5,
        total: 16,
        totalPages: 4
      });
    });
  });

  describe('GET /api/campaigns/:id', () => {
    it('should return campaign by contractId', async () => {
      const response = await request(app)
        .get(`/api/campaigns/${testCampaign.contractId}`)
        .expect(200);

      expect(response.body.campaign.name).toBe(testCampaign.name);
      expect(response.body.campaign.contractId).toBe(testCampaign.contractId);
    });

    it('should return 404 for non-existent campaign', async () => {
      const response = await request(app)
        .get('/api/campaigns/999')
        .expect(404);

      expect(response.body.error.message).toBe('Campaign not found');
    });

    it('should merge blockchain data when available', async () => {
      // Mock Web3Service to return different data
      jest.doMock('../services/Web3Service', () => ({
        getCampaign: jest.fn().mockResolvedValue({
          currentAmount: 5000,
          participantCount: 10,
          status: 'active',
          winners: [],
          totalBurned: 0
        })
      }));

      const response = await request(app)
        .get(`/api/campaigns/${testCampaign.contractId}`)
        .expect(200);

      expect(response.body.campaign.currentAmount).toBe(5000);
      expect(response.body.campaign.participantCount).toBe(10);
    });
  });

  describe('GET /api/campaigns/:id/participants', () => {
    beforeEach(async () => {
      // Create test participants
      await createTestParticipant(testCampaign._id, { walletAddress: '0x1111111111111111111111111111111111111111' });
      await createTestParticipant(testCampaign._id, { walletAddress: '0x2222222222222222222222222222222222222222' });
      await createTestParticipant(testCampaign._id, { walletAddress: '0x3333333333333333333333333333333333333333' });
    });

    it('should return campaign participants with pagination', async () => {
      const response = await request(app)
        .get(`/api/campaigns/${testCampaign.contractId}/participants`)
        .expect(200);

      expect(response.body.participants).toHaveLength(3);
      expect(response.body.pagination.total).toBe(3);
    });

    it('should handle pagination for participants', async () => {
      const response = await request(app)
        .get(`/api/campaigns/${testCampaign.contractId}/participants?page=1&limit=2`)
        .expect(200);

      expect(response.body.participants).toHaveLength(2);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 2,
        total: 3,
        totalPages: 2
      });
    });

    it('should return 404 for non-existent campaign participants', async () => {
      const response = await request(app)
        .get('/api/campaigns/999/participants')
        .expect(404);

      expect(response.body.error.message).toBe('Campaign not found');
    });
  });

  describe('GET /api/campaigns/:id/winners', () => {
    it('should return winners for finished campaign', async () => {
      const finishedCampaign = await createTestCampaign({
        contractId: 2,
        status: 'finished',
        winners: [
          { walletAddress: '0x1111111111111111111111111111111111111111', prizeIndex: 0, prizeName: 'First Prize' }
        ]
      });

      const response = await request(app)
        .get(`/api/campaigns/${finishedCampaign.contractId}/winners`)
        .expect(200);

      expect(response.body.winners).toHaveLength(1);
      expect(response.body.winners[0].walletAddress).toBe('0x1111111111111111111111111111111111111111');
    });

    it('should return 400 for non-finished campaign', async () => {
      const response = await request(app)
        .get(`/api/campaigns/${testCampaign.contractId}/winners`)
        .expect(400);

      expect(response.body.error.message).toBe('Campaign has not finished yet');
    });
  });

  describe('POST /api/campaigns/:id/participate', () => {
    const mockWalletAddress = '0x1234567890123456789012345678901234567890';
    
    beforeEach(() => {
      // Mock authentication middleware
      app.use('/api/campaigns/:id/participate', mockAuth(mockWalletAddress));
    });

    it('should allow user to participate in active campaign', async () => {
      const activeCampaign = await createTestCampaign({
        contractId: 2,
        status: 'active',
        startDate: new Date(Date.now() - 100000), // Started
        endDate: new Date(Date.now() + 100000) // Not ended
      });

      const response = await request(app)
        .post(`/api/campaigns/${activeCampaign.contractId}/participate`)
        .send({
          stakeAmount: 1000,
          stakeTxHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          signature: 'valid_signature',
          message: 'Sign this message',
          walletAddress: mockWalletAddress
        })
        .expect(201);

      expect(response.body.message).toBe('Successfully participated in campaign');
      expect(response.body.participant.ticketCount).toBe(10); // 1000 / 100 = 10 tickets
    });

    it('should prevent duplicate participation', async () => {
      const activeCampaign = await createTestCampaign({
        contractId: 2,
        status: 'active',
        startDate: new Date(Date.now() - 100000),
        endDate: new Date(Date.now() + 100000)
      });

      // Create existing participant
      await createTestParticipant(activeCampaign._id, { walletAddress: mockWalletAddress });

      const response = await request(app)
        .post(`/api/campaigns/${activeCampaign.contractId}/participate`)
        .send({
          stakeAmount: 1000,
          stakeTxHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          signature: 'valid_signature',
          message: 'Sign this message',
          walletAddress: mockWalletAddress
        })
        .expect(409);

      expect(response.body.error.message).toBe('Already participated in this campaign');
    });

    it('should reject participation with insufficient stake amount', async () => {
      const activeCampaign = await createTestCampaign({
        contractId: 2,
        status: 'active',
        startDate: new Date(Date.now() - 100000),
        endDate: new Date(Date.now() + 100000)
      });

      const response = await request(app)
        .post(`/api/campaigns/${activeCampaign.contractId}/participate`)
        .send({
          stakeAmount: 50, // Less than ticket amount (100)
          stakeTxHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          signature: 'valid_signature',
          message: 'Sign this message',
          walletAddress: mockWalletAddress
        })
        .expect(400);

      expect(response.body.error.message).toBe('Stake amount must be at least one ticket worth');
    });

    it('should reject participation in inactive campaign', async () => {
      const response = await request(app)
        .post(`/api/campaigns/${testCampaign.contractId}/participate`)
        .send({
          stakeAmount: 1000,
          stakeTxHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          signature: 'valid_signature',
          message: 'Sign this message',
          walletAddress: mockWalletAddress
        })
        .expect(400);

      expect(response.body.error.message).toBe('Campaign is not active');
    });
  });

  describe('POST /api/campaigns/:id/verify-social', () => {
    const mockWalletAddress = '0x1234567890123456789012345678901234567890';
    let participant: any;

    beforeEach(async () => {
      app.use('/api/campaigns/:id/verify-social', mockAuth(mockWalletAddress));
      participant = await createTestParticipant(testCampaign._id, { walletAddress: mockWalletAddress });
    });

    it('should verify social media task', async () => {
      const response = await request(app)
        .post(`/api/campaigns/${testCampaign.contractId}/verify-social`)
        .send({
          taskType: 'twitterFollow',
          proof: 'twitter_proof_data',
          signature: 'valid_signature',
          message: 'Sign this message',
          walletAddress: mockWalletAddress
        })
        .expect(200);

      expect(response.body.message).toBe('Social task verified successfully');
      expect(response.body.taskType).toBe('twitterFollow');

      // Check that participant was updated
      const updatedParticipant = await Participant.findById(participant._id);
      expect(updatedParticipant?.socialTasksCompleted.twitterFollow).toBe(true);
    });

    it('should reject verification for non-participant', async () => {
      const nonParticipantWallet = '0x9999999999999999999999999999999999999999';
      
      const response = await request(app)
        .post(`/api/campaigns/${testCampaign.contractId}/verify-social`)
        .send({
          taskType: 'twitterFollow',
          proof: 'twitter_proof_data',
          signature: 'valid_signature',
          message: 'Sign this message',
          walletAddress: nonParticipantWallet
        })
        .set('X-Wallet-Address', nonParticipantWallet)
        .expect(404);

      expect(response.body.error.message).toBe('Not participating in this campaign');
    });
  });

  describe('GET /api/campaigns/:id/my-status', () => {
    const mockWalletAddress = '0x1234567890123456789012345678901234567890';

    beforeEach(() => {
      app.use('/api/campaigns/:id/my-status', mockAuth(mockWalletAddress));
    });

    it('should return user participation status', async () => {
      const participant = await createTestParticipant(testCampaign._id, {
        walletAddress: mockWalletAddress,
        socialTasksCompleted: {
          twitterFollow: true,
          twitterLike: true,
          twitterRetweet: false,
          discordJoined: false,
          telegramJoined: false,
          mediumFollowed: false,
          newsletterSubscribed: false,
          emailAddress: 'test@example.com'
        }
      });

      const response = await request(app)
        .get(`/api/campaigns/${testCampaign.contractId}/my-status`)
        .set('X-Wallet-Address', mockWalletAddress)
        .expect(200);

      expect(response.body.isParticipating).toBe(true);
      expect(response.body.status.ticketCount).toBe(participant.ticketCount);
      expect(response.body.status.socialTasksCompleted.twitterFollow).toBe(true);
      expect(response.body.status.allTasksCompleted).toBe(false);
    });

    it('should return non-participating status for non-participant', async () => {
      const response = await request(app)
        .get(`/api/campaigns/${testCampaign.contractId}/my-status`)
        .set('X-Wallet-Address', mockWalletAddress)
        .expect(200);

      expect(response.body.isParticipating).toBe(false);
      expect(response.body.status).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid campaign ID format', async () => {
      const response = await request(app)
        .get('/api/campaigns/invalid-id')
        .expect(404);

      expect(response.body.error).toBeDefined();
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error
      jest.spyOn(Campaign, 'find').mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/campaigns')
        .expect(500);

      expect(response.body.error).toBeDefined();
    });

    it('should validate request parameters', async () => {
      const response = await request(app)
        .get('/api/campaigns?page=-1&limit=1001')
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Performance Tests', () => {
    it('should handle large number of campaigns efficiently', async () => {
      // Create 1000 campaigns
      const campaigns = [];
      for (let i = 1; i <= 1000; i++) {
        campaigns.push(createTestCampaign({ contractId: i, name: `Campaign ${i}` }));
      }
      await Promise.all(campaigns);

      const startTime = Date.now();
      const response = await request(app)
        .get('/api/campaigns?limit=50')
        .expect(200);
      const endTime = Date.now();

      expect(response.body.campaigns).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle concurrent requests', async () => {
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(request(app).get('/api/campaigns'));
      }

      const responses = await Promise.all(requests);
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });
});
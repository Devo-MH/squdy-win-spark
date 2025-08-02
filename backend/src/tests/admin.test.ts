import request from 'supertest';
import { Application } from 'express';
import { setupTestDB, teardownTestDB, clearTestDB, createTestApp, createTestCampaign, createTestParticipant, mockAuth } from './setup';
import Campaign from '../models/Campaign';
import Participant from '../models/Participant';

describe('Admin API Tests', () => {
  let app: Application;
  const adminWallet = '0x123456789012345678901234567890123456789a';
  const nonAdminWallet = '0x999999999999999999999999999999999999999a';

  beforeAll(async () => {
    await setupTestDB();
    app = createTestApp();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  describe('GET /api/admin/dashboard', () => {
    beforeEach(() => {
      app.use('/api/admin/dashboard', mockAuth(adminWallet, true));
    });

    it('should return dashboard data for admin', async () => {
      // Create test data
      await createTestCampaign({ status: 'active' });
      await createTestCampaign({ status: 'finished' });
      const campaign = await createTestCampaign({ status: 'active' });
      await createTestParticipant(campaign._id);

      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('X-Wallet-Address', adminWallet)
        .expect(200);

      expect(response.body.recentCampaigns).toBeDefined();
      expect(response.body.recentParticipants).toBeDefined();
      expect(response.body.stats).toBeDefined();
    });

    it('should reject non-admin access', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('X-Wallet-Address', nonAdminWallet)
        .expect(403);

      expect(response.body.error.message).toBe('Admin access required');
    });
  });

  describe('GET /api/admin/stats', () => {
    beforeEach(() => {
      app.use('/api/admin/stats', mockAuth(adminWallet, true));
    });

    it('should return platform statistics', async () => {
      // Create test data
      await createTestCampaign({ status: 'active' });
      await createTestCampaign({ status: 'burned', totalBurned: 5000 });
      const campaign = await createTestCampaign();
      await createTestParticipant(campaign._id, { stakedAmount: 1000 });

      const response = await request(app)
        .get('/api/admin/stats')
        .expect(200);

      expect(response.body.stats).toMatchObject({
        totalCampaigns: 3,
        activeCampaigns: 1,
        totalParticipants: 1,
        totalStaked: 1000,
        totalBurned: 5000
      });
    });
  });

  describe('POST /api/admin/campaigns', () => {
    beforeEach(() => {
      app.use('/api/admin/campaigns', mockAuth(adminWallet, true));
    });

    it('should create campaign with valid data', async () => {
      const campaignData = {
        name: 'New Admin Campaign',
        description: 'Created by admin',
        imageUrl: 'https://example.com/image.jpg',
        softCap: 10000,
        hardCap: 100000,
        ticketAmount: 100,
        startDate: new Date(Date.now() + 100000).toISOString(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        prizes: [
          { name: 'First Prize', description: 'Main prize', value: '1000', currency: 'USD', quantity: 1 }
        ],
        socialRequirements: {
          twitter: { followAccount: '@TestToken', likePostId: '123', retweetPostId: '456' },
          discord: { serverId: '789', inviteLink: 'discord.gg/test' },
          telegram: { groupId: '101112', inviteLink: 't.me/test' },
          medium: { profileUrl: 'medium.com/@test' },
          newsletter: { endpoint: 'test.com/newsletter' }
        }
      };

      const response = await request(app)
        .post('/api/admin/campaigns')
        .send({
          ...campaignData,
          signature: 'valid_signature',
          message: 'Sign this message',
          walletAddress: adminWallet
        })
        .expect(201);

      expect(response.body.message).toBe('Campaign created successfully');
      expect(response.body.campaign.name).toBe(campaignData.name);

      // Verify campaign was created in database
      const campaign = await Campaign.findOne({ name: campaignData.name });
      expect(campaign).toBeTruthy();
      expect(campaign?.status).toBe('pending');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/admin/campaigns')
        .send({
          name: '', // Missing required field
          signature: 'valid_signature',
          message: 'Sign this message',
          walletAddress: adminWallet
        })
        .expect(400);

      expect(response.body.error.message).toBe('Please fill in all required fields');
    });

    it('should validate caps relationship', async () => {
      const response = await request(app)
        .post('/api/admin/campaigns')
        .send({
          name: 'Invalid Campaign',
          description: 'Test',
          softCap: 100000,
          hardCap: 50000, // Hard cap less than soft cap
          ticketAmount: 100,
          startDate: new Date(Date.now() + 100000).toISOString(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          signature: 'valid_signature',
          message: 'Sign this message',
          walletAddress: adminWallet
        })
        .expect(400);

      expect(response.body.error.message).toBe('Hard cap must be greater than soft cap');
    });

    it('should validate date relationships', async () => {
      const response = await request(app)
        .post('/api/admin/campaigns')
        .send({
          name: 'Invalid Dates Campaign',
          description: 'Test',
          softCap: 10000,
          hardCap: 100000,
          ticketAmount: 100,
          startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date(Date.now() + 100000).toISOString(), // End before start
          signature: 'valid_signature',
          message: 'Sign this message',
          walletAddress: adminWallet
        })
        .expect(400);

      expect(response.body.error.message).toBe('End date must be after start date');
    });
  });

  describe('PUT /api/admin/campaigns/:id', () => {
    let testCampaign: any;

    beforeEach(async () => {
      app.use('/api/admin/campaigns/:id', mockAuth(adminWallet, true));
      testCampaign = await createTestCampaign();
    });

    it('should update pending campaign', async () => {
      const updateData = {
        name: 'Updated Campaign Name',
        description: 'Updated description',
        imageUrl: 'https://example.com/new-image.jpg'
      };

      const response = await request(app)
        .put(`/api/admin/campaigns/${testCampaign.contractId}`)
        .send({
          ...updateData,
          signature: 'valid_signature',
          message: 'Sign this message',
          walletAddress: adminWallet
        })
        .expect(200);

      expect(response.body.message).toBe('Campaign updated successfully');

      // Verify update in database
      const updatedCampaign = await Campaign.findById(testCampaign._id);
      expect(updatedCampaign?.name).toBe(updateData.name);
      expect(updatedCampaign?.description).toBe(updateData.description);
    });

    it('should reject updates to non-pending campaigns', async () => {
      await Campaign.findByIdAndUpdate(testCampaign._id, { status: 'active' });

      const response = await request(app)
        .put(`/api/admin/campaigns/${testCampaign.contractId}`)
        .send({
          name: 'Updated Name',
          signature: 'valid_signature',
          message: 'Sign this message',
          walletAddress: adminWallet
        })
        .expect(400);

      expect(response.body.error.message).toBe('Can only update pending campaigns');
    });
  });

  describe('Campaign State Management', () => {
    let testCampaign: any;

    beforeEach(async () => {
      app.use('/api/admin/campaigns/:id/activate', mockAuth(adminWallet, true));
      app.use('/api/admin/campaigns/:id/pause', mockAuth(adminWallet, true));
      app.use('/api/admin/campaigns/:id/close', mockAuth(adminWallet, true));
      app.use('/api/admin/campaigns/:id/select-winners', mockAuth(adminWallet, true));
      app.use('/api/admin/campaigns/:id/burn-tokens', mockAuth(adminWallet, true));
      
      testCampaign = await createTestCampaign({
        startDate: new Date(Date.now() - 100000), // Past start date
        endDate: new Date(Date.now() + 100000) // Future end date
      });
    });

    it('should activate pending campaign', async () => {
      const response = await request(app)
        .post(`/api/admin/campaigns/${testCampaign.contractId}/activate`)
        .send({
          signature: 'valid_signature',
          message: 'Sign this message',
          walletAddress: adminWallet
        })
        .expect(200);

      expect(response.body.message).toBe('Campaign activated successfully');

      const updatedCampaign = await Campaign.findById(testCampaign._id);
      expect(updatedCampaign?.status).toBe('active');
    });

    it('should pause active campaign', async () => {
      await Campaign.findByIdAndUpdate(testCampaign._id, { status: 'active' });

      const response = await request(app)
        .post(`/api/admin/campaigns/${testCampaign.contractId}/pause`)
        .send({
          signature: 'valid_signature',
          message: 'Sign this message',
          walletAddress: adminWallet
        })
        .expect(200);

      expect(response.body.message).toBe('Campaign paused successfully');

      const updatedCampaign = await Campaign.findById(testCampaign._id);
      expect(updatedCampaign?.status).toBe('paused');
    });

    it('should close active campaign', async () => {
      await Campaign.findByIdAndUpdate(testCampaign._id, { 
        status: 'active',
        endDate: new Date(Date.now() - 1000) // Past end date
      });

      const response = await request(app)
        .post(`/api/admin/campaigns/${testCampaign.contractId}/close`)
        .send({
          signature: 'valid_signature',
          message: 'Sign this message',
          walletAddress: adminWallet
        })
        .expect(200);

      expect(response.body.message).toBe('Campaign closed successfully');

      const updatedCampaign = await Campaign.findById(testCampaign._id);
      expect(updatedCampaign?.status).toBe('finished');
    });

    it('should select winners for finished campaign', async () => {
      await Campaign.findByIdAndUpdate(testCampaign._id, { status: 'finished' });

      const response = await request(app)
        .post(`/api/admin/campaigns/${testCampaign.contractId}/select-winners`)
        .send({
          signature: 'valid_signature',
          message: 'Sign this message',
          walletAddress: adminWallet
        })
        .expect(200);

      expect(response.body.message).toBe('Winner selection initiated');
    });

    it('should burn tokens for finished campaign with winners', async () => {
      await Campaign.findByIdAndUpdate(testCampaign._id, { 
        status: 'finished',
        winners: [{ walletAddress: '0x1111111111111111111111111111111111111111', prizeIndex: 0 }],
        currentAmount: 5000
      });

      const response = await request(app)
        .post(`/api/admin/campaigns/${testCampaign.contractId}/burn-tokens`)
        .send({
          signature: 'valid_signature',
          message: 'Sign this message',
          walletAddress: adminWallet
        })
        .expect(200);

      expect(response.body.message).toBe('Tokens burned successfully');

      const updatedCampaign = await Campaign.findById(testCampaign._id);
      expect(updatedCampaign?.status).toBe('burned');
      expect(updatedCampaign?.totalBurned).toBe(5000);
    });

    it('should reject invalid state transitions', async () => {
      // Try to pause pending campaign
      const response = await request(app)
        .post(`/api/admin/campaigns/${testCampaign.contractId}/pause`)
        .send({
          signature: 'valid_signature',
          message: 'Sign this message',
          walletAddress: adminWallet
        })
        .expect(400);

      expect(response.body.error.message).toBe('Can only pause active campaigns');
    });

    it('should reject activation before start date', async () => {
      const futureCampaign = await createTestCampaign({
        startDate: new Date(Date.now() + 100000) // Future start date
      });

      const response = await request(app)
        .post(`/api/admin/campaigns/${futureCampaign.contractId}/activate`)
        .send({
          signature: 'valid_signature',
          message: 'Sign this message',
          walletAddress: adminWallet
        })
        .expect(400);

      expect(response.body.error.message).toBe('Cannot activate campaign before start date');
    });

    it('should reject burning without winners', async () => {
      await Campaign.findByIdAndUpdate(testCampaign._id, { 
        status: 'finished',
        winners: [] // No winners
      });

      const response = await request(app)
        .post(`/api/admin/campaigns/${testCampaign.contractId}/burn-tokens`)
        .send({
          signature: 'valid_signature',
          message: 'Sign this message',
          walletAddress: adminWallet
        })
        .expect(400);

      expect(response.body.error.message).toBe('Winners must be selected before burning tokens');
    });
  });

  describe('POST /api/admin/campaigns/:id/upload-image', () => {
    let testCampaign: any;

    beforeEach(async () => {
      app.use('/api/admin/campaigns/:id/upload-image', mockAuth(adminWallet, true));
      testCampaign = await createTestCampaign();
    });

    it('should update campaign image URL', async () => {
      const newImageUrl = 'https://example.com/new-campaign-image.jpg';

      const response = await request(app)
        .post(`/api/admin/campaigns/${testCampaign.contractId}/upload-image`)
        .send({
          imageUrl: newImageUrl,
          signature: 'valid_signature',
          message: 'Sign this message',
          walletAddress: adminWallet
        })
        .expect(200);

      expect(response.body.message).toBe('Campaign image uploaded successfully');
      expect(response.body.imageUrl).toBe(newImageUrl);

      const updatedCampaign = await Campaign.findById(testCampaign._id);
      expect(updatedCampaign?.imageUrl).toBe(newImageUrl);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      app.use('/api/admin/*', mockAuth(adminWallet, true));
    });

    it('should handle non-existent campaign operations', async () => {
      const response = await request(app)
        .post('/api/admin/campaigns/999/activate')
        .send({
          signature: 'valid_signature',
          message: 'Sign this message',
          walletAddress: adminWallet
        })
        .expect(404);

      expect(response.body.error.message).toBe('Campaign not found');
    });

    it('should handle database errors', async () => {
      jest.spyOn(Campaign, 'findOne').mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/admin/stats')
        .expect(500);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Security Tests', () => {
    it('should require authentication for all admin endpoints', async () => {
      const endpoints = [
        'GET /api/admin/dashboard',
        'GET /api/admin/stats',
        'POST /api/admin/campaigns',
        'PUT /api/admin/campaigns/1',
        'POST /api/admin/campaigns/1/activate'
      ];

      for (const endpoint of endpoints) {
        const [method, path] = endpoint.split(' ');
        const req = request(app)[method.toLowerCase() as keyof typeof request](path);
        
        const response = await req.expect(401);
        expect(response.body.error.message).toBe('Wallet address required');
      }
    });

    it('should validate admin wallet addresses', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('X-Wallet-Address', nonAdminWallet)
        .expect(403);

      expect(response.body.error.message).toBe('Admin access required');
    });

    it('should sanitize input data', async () => {
      const maliciousData = {
        name: '<script>alert("xss")</script>',
        description: 'javascript:alert("xss")',
        imageUrl: 'http://malicious.com/script.js'
      };

      const response = await request(app)
        .post('/api/admin/campaigns')
        .send({
          ...maliciousData,
          softCap: 10000,
          hardCap: 100000,
          ticketAmount: 100,
          startDate: new Date(Date.now() + 100000).toISOString(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          signature: 'valid_signature',
          message: 'Sign this message',
          walletAddress: adminWallet
        })
        .expect(201);

      // Verify that dangerous content is sanitized
      const campaign = await Campaign.findOne({ name: { $regex: /script/ } });
      expect(campaign).toBeNull();
    });
  });
});
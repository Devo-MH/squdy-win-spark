const express = require('express');
const cors = require('cors');
const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage for campaigns
let campaigns = [
  {
    id: 1,
    contractId: 1,
    name: "Test Campaign",
    description: "A test campaign for development",
    imageUrl: "https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=800&h=400&fit=crop",
    status: "active",
    currentAmount: 1000,
    hardCap: 10000,
    participantCount: 5,
    softCap: 500,
    ticketAmount: 100,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    prizes: [
      { name: "First Prize", value: 1000, currency: "USD" },
      { name: "Second Prize", value: 500, currency: "USD" }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

let nextCampaignId = 2;

// Health endpoint
app.get('/health', (req, res) => {
  res.send('OK');
});

// Dynamic campaigns endpoint
app.get('/api/campaigns', (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  
  let filteredCampaigns = campaigns;
  if (status) {
    filteredCampaigns = campaigns.filter(c => c.status === status);
  }
  
  const total = filteredCampaigns.length;
  const totalPages = Math.ceil(total / limit);
  const startIdx = (page - 1) * limit;
  const endIdx = startIdx + parseInt(limit);
  const paginatedCampaigns = filteredCampaigns.slice(startIdx, endIdx);
  
  res.json({
    campaigns: paginatedCampaigns,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages
    }
  });
});

// Dynamic campaign detail endpoint
app.get('/api/campaigns/:id', (req, res) => {
  const campaignId = parseInt(req.params.id);
  const campaign = campaigns.find(c => c.id === campaignId);
  
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }
  
  // Add default social requirements if not present
  const campaignWithSocial = {
    ...campaign,
    socialRequirements: campaign.socialRequirements || {
      twitter: { followAccount: "@test", likePostId: "123", retweetPostId: "123" },
      discord: { serverId: "123", inviteLink: "https://discord.gg/test" },
      telegram: { groupId: "123", inviteLink: "https://t.me/test" },
      medium: { profileUrl: "https://medium.com/test" },
      newsletter: { endpoint: "/newsletter" }
    }
  };
  
  res.json({
    campaign: campaignWithSocial
  });
});

// Test campaign my-status endpoint
app.get('/api/campaigns/:id/my-status', (req, res) => {
  res.json({
    status: {
      isParticipating: false,
      stakeAmount: 0,
      socialTasksCompleted: {
        twitterFollow: false,
        twitterLike: false,
        twitterRetweet: false,
        discordJoined: false,
        telegramJoined: false,
        mediumFollowed: false,
        newsletterSubscribed: false
      },
      tickets: 0,
      isEligible: false
    }
  });
});

// Auth endpoints for testing
app.get('/api/auth/nonce/:walletAddress', (req, res) => {
  const { walletAddress } = req.params;
  
  // Generate a random nonce for testing
  const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const timestamp = Date.now();
  
  res.json({
    message: `Sign this message to authenticate with Squdy:\n\nWallet: ${walletAddress}\nNonce: ${nonce}\nTimestamp: ${timestamp}`,
    nonce,
    timestamp
  });
});

app.post('/api/auth/verify-signature', (req, res) => {
  const { message, signature, walletAddress } = req.body;
  
  // For testing purposes, always return success
  // In a real implementation, you would verify the signature
  res.json({
    verified: true,
    user: {
      walletAddress,
      isAdmin: walletAddress.toLowerCase() === '0x1234567890123456789012345678901234567890', // Mock admin check
      nonce: Math.random().toString(36).substring(2, 15)
    },
    token: 'mock-jwt-token-' + Math.random().toString(36).substring(2, 15)
  });
});

// Admin API endpoints for testing
app.get('/api/admin/stats', (req, res) => {
  res.json({
    totalCampaigns: 5,
    activeCampaigns: 3,
    totalParticipants: 150,
    totalStaked: 50000,
    totalBurned: 2500,
    recentActivity: [
      { type: 'campaign_created', campaign: 'Test Campaign 1', timestamp: new Date().toISOString() },
      { type: 'participant_joined', wallet: '0x1234...', campaign: 'Test Campaign 2', timestamp: new Date().toISOString() },
      { type: 'campaign_finished', campaign: 'Test Campaign 3', timestamp: new Date().toISOString() }
    ]
  });
});

app.get('/api/admin/dashboard', (req, res) => {
  res.json({
    stats: {
      totalCampaigns: 5,
      activeCampaigns: 3,
      totalParticipants: 150,
      totalStaked: 50000,
      totalBurned: 2500
    },
    recentCampaigns: [
      {
        id: 1,
        name: 'Test Campaign 1',
        status: 'active',
        participantCount: 25,
        currentAmount: 5000,
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 2,
        name: 'Test Campaign 2',
        status: 'pending',
        participantCount: 0,
        currentAmount: 0,
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]
  });
});

app.post('/api/admin/campaigns', (req, res) => {
  const campaignData = req.body;
  
  // Create new campaign with proper defaults
  const newCampaign = {
    id: nextCampaignId++,
    contractId: nextCampaignId - 1,
    ...campaignData,
    status: campaignData.status || 'pending',
    participantCount: 0,
    currentAmount: 0,
    // Ensure required fields have defaults
    hardCap: campaignData.hardCap || 10000,
    softCap: campaignData.softCap || 5000,
    ticketAmount: campaignData.ticketAmount || 100,
    imageUrl: campaignData.imageUrl || "https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=800&h=400&fit=crop",
    startDate: campaignData.startDate || new Date().toISOString(),
    endDate: campaignData.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    prizes: campaignData.prizes || [
      { name: "First Prize", value: 1000, currency: "USD" },
      { name: "Second Prize", value: 500, currency: "USD" }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  // Add to campaigns array
  campaigns.push(newCampaign);
  
  res.status(201).json({
    success: true,
    campaign: newCampaign,
    message: 'Campaign created successfully'
  });
});

app.put('/api/admin/campaigns/:id', (req, res) => {
  const campaignId = parseInt(req.params.id);
  const updateData = req.body;
  
  const campaignIndex = campaigns.findIndex(c => c.id === campaignId);
  if (campaignIndex === -1) {
    return res.status(404).json({ error: 'Campaign not found' });
  }
  
  // Update the campaign
  campaigns[campaignIndex] = {
    ...campaigns[campaignIndex],
    ...updateData,
    id: campaignId, // Ensure ID doesn't change
    updatedAt: new Date().toISOString()
  };
  
  res.json({
    success: true,
    campaign: campaigns[campaignIndex],
    message: 'Campaign updated successfully'
  });
});

app.post('/api/admin/campaigns/:id/activate', (req, res) => {
  const campaignId = parseInt(req.params.id);
  const campaignIndex = campaigns.findIndex(c => c.id === campaignId);
  
  if (campaignIndex === -1) {
    return res.status(404).json({ error: 'Campaign not found' });
  }
  
  campaigns[campaignIndex].status = 'active';
  campaigns[campaignIndex].updatedAt = new Date().toISOString();
  
  res.json({
    success: true,
    campaign: campaigns[campaignIndex],
    message: `Campaign ${campaignId} activated successfully`
  });
});

app.post('/api/admin/campaigns/:id/pause', (req, res) => {
  const campaignId = parseInt(req.params.id);
  const campaignIndex = campaigns.findIndex(c => c.id === campaignId);
  
  if (campaignIndex === -1) {
    return res.status(404).json({ error: 'Campaign not found' });
  }
  
  campaigns[campaignIndex].status = 'paused';
  campaigns[campaignIndex].updatedAt = new Date().toISOString();
  
  res.json({
    success: true,
    campaign: campaigns[campaignIndex],
    message: `Campaign ${campaignId} paused successfully`
  });
});

app.post('/api/admin/campaigns/:id/close', (req, res) => {
  const campaignId = parseInt(req.params.id);
  const campaignIndex = campaigns.findIndex(c => c.id === campaignId);
  
  if (campaignIndex === -1) {
    return res.status(404).json({ error: 'Campaign not found' });
  }
  
  campaigns[campaignIndex].status = 'closed';
  campaigns[campaignIndex].updatedAt = new Date().toISOString();
  
  res.json({
    success: true,
    campaign: campaigns[campaignIndex],
    message: `Campaign ${campaignId} closed successfully`
  });
});

app.post('/api/admin/campaigns/:id/upload-image', (req, res) => {
  const { id } = req.params;
  const { imageUrl } = req.body;
  
  res.json({
    success: true,
    imageUrl,
    message: `Image uploaded for campaign ${id}`
  });
});

app.post('/api/admin/campaigns/:id/select-winners', (req, res) => {
  const { id } = req.params;
  
  res.json({
    success: true,
    winners: [
      { walletAddress: '0x1234...', prizeIndex: 0, prizeName: 'First Prize' },
      { walletAddress: '0x5678...', prizeIndex: 1, prizeName: 'Second Prize' }
    ],
    message: `Winners selected for campaign ${id}`
  });
});

app.post('/api/admin/campaigns/:id/burn-tokens', (req, res) => {
  const { id } = req.params;
  
  res.json({
    success: true,
    burnedAmount: 2500,
    txHash: '0xburn123...',
    message: `Tokens burned successfully for campaign ${id}`
  });
});

// Participant API endpoints for testing
app.get('/api/participants/my-participations', (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  
  res.json({
    participations: [
      {
        campaignId: 1,
        campaignName: 'Test Campaign 1',
        status: 'active',
        stakeAmount: 100,
        ticketCount: 1,
        socialTasksCompleted: {
          twitterFollow: true,
          twitterLike: false,
          twitterRetweet: false,
          discordJoined: true,
          telegramJoined: false,
          mediumFollowed: false,
          newsletterSubscribed: false
        },
        joinedAt: new Date().toISOString()
      }
    ],
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: 1,
      totalPages: 1
    }
  });
});

app.get('/api/participants/my-stats', (req, res) => {
  res.json({
    totalParticipations: 5,
    totalStaked: 500,
    totalTickets: 5,
    totalWins: 1,
    totalBurned: 50,
    averageParticipation: 100,
    socialCompletionRate: 0.8
  });
});

// Additional campaign endpoints
app.get('/api/campaigns/:id/participants', (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 10 } = req.query;
  
  res.json({
    participants: [
      {
        walletAddress: '0x1234567890123456789012345678901234567890',
        campaignId: id,
        socialTasksCompleted: {
          twitterFollow: true,
          twitterLike: false,
          twitterRetweet: false,
          discordJoined: true,
          telegramJoined: false,
          mediumFollowed: false,
          newsletterSubscribed: false,
          emailAddress: 'test@example.com'
        },
        stakeTxHash: '0xabc123...',
        ticketCount: 1,
        stakedAmount: 100,
        isWinner: false,
        joinedAt: new Date().toISOString()
      }
    ],
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: 1,
      totalPages: 1
    }
  });
});

app.get('/api/campaigns/:id/winners', (req, res) => {
  const { id } = req.params;
  
  res.json({
    winners: [
      {
        walletAddress: '0x1234567890123456789012345678901234567890',
        prizeIndex: 0,
        prizeName: 'First Prize'
      }
    ]
  });
});

app.post('/api/campaigns/:id/participate', (req, res) => {
  const { id } = req.params;
  const { stakeAmount, stakeTxHash } = req.body;
  
  res.json({
    success: true,
    participation: {
      campaignId: id,
      stakeAmount,
      stakeTxHash,
      ticketCount: Math.floor(stakeAmount / 100), // Assuming 100 per ticket
      joinedAt: new Date().toISOString()
    },
    message: 'Successfully participated in campaign'
  });
});

app.post('/api/campaigns/:id/verify-social', (req, res) => {
  const { id } = req.params;
  const { taskType, proof } = req.body;
  
  res.json({
    success: true,
    taskCompleted: true,
    message: `${taskType} task verified successfully`
  });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Simple backend server running on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  console.log(`📋 Campaigns: http://localhost:${port}/api/campaigns`);
}); 
const express = require('express');
const cors = require('cors');
const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health endpoint
app.get('/health', (req, res) => {
  res.send('OK');
});

// Test campaigns endpoint
app.get('/api/campaigns', (req, res) => {
  res.json({
    campaigns: [
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
        ]
      }
    ],
    pagination: {
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1
    }
  });
});

// Test campaign detail endpoint
app.get('/api/campaigns/:id', (req, res) => {
  res.json({
    campaign: {
      id: parseInt(req.params.id),
      contractId: parseInt(req.params.id),
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
      socialRequirements: {
        twitter: { followAccount: "@test", likePostId: "123", retweetPostId: "123" },
        discord: { serverId: "123", inviteLink: "https://discord.gg/test" },
        telegram: { groupId: "123", inviteLink: "https://t.me/test" },
        medium: { profileUrl: "https://medium.com/test" },
        newsletter: { endpoint: "/newsletter" }
      }
    }
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

// Start server
app.listen(port, () => {
  console.log(`🚀 Simple backend server running on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  console.log(`📋 Campaigns: http://localhost:${port}/api/campaigns`);
}); 
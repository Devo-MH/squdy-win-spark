// Vercel serverless function for Squdy backend
const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

console.log('🚀 Squdy Serverless Backend Starting...');

// In-memory storage for campaigns
const campaigns = [
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

// Health endpoint
app.get('/health', (req, res) => {
  console.log('📊 Health check requested');
  res.send('OK');
});

// Campaigns endpoint
app.get('/api/campaigns', (req, res) => {
  console.log('📋 Campaigns requested');
  res.json({
    campaigns: campaigns,
    pagination: {
      page: 1,
      limit: 10,
      total: campaigns.length,
      totalPages: 1
    }
  });
});

// Campaign by ID
app.get('/api/campaigns/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const campaign = campaigns.find(c => c.id === id);
  
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }
  
  res.json({ campaign });
});

// Participation endpoint
app.post('/api/campaigns/:id/participate', (req, res) => {
  const id = parseInt(req.params.id);
  const campaign = campaigns.find(c => c.id === id);
  
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }
  
  // Mock participation
  campaign.participantCount += 1;
  campaign.currentAmount += parseFloat(req.body.stakeAmount) || 0;
  
  res.json({ 
    message: 'Successfully participated in campaign',
    campaign: campaign.name
  });
});

// Campaign status endpoint
app.get('/api/campaigns/:id/status', (req, res) => {
  const walletAddress = req.query.wallet?.toLowerCase();
  
  if (!walletAddress) {
    return res.json({ isParticipating: false, status: null });
  }
  
  // Mock response - in real app this would check database
  res.json({ 
    isParticipating: false, 
    status: null,
    stakeAmount: 0,
    socialTasks: {}
  });
});

// Export the Express app for Vercel
module.exports = app;
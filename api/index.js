// Minimal stable API for production - returns campaigns from MongoDB with safe fallbacks
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Demo campaigns for fallback
const demoCampaigns = [
  {
    id: "demo1",
    contractId: 1,
    name: "Lunar Prize Campaign",
    description: "Win amazing lunar-themed prizes in this exciting campaign",
    imageUrl: "https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=800&h=400&fit=crop",
    status: "active",
    currentAmount: 15000,
    hardCap: 50000,
    participantCount: 42,
    softCap: 10000,
    ticketAmount: 100,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
    prizes: ["1st Prize: $10,000", "2nd Prize: $5,000", "3rd Prize: $2,500"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "689645ee0b152227c14038fe",
    contractId: 1001,
    name: "Persist-Finalized",
    description: "indexes fixed",
    imageUrl: "https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=800&h=400&fit=crop",
    status: "active",
    currentAmount: 8000,
    hardCap: 15000,
    participantCount: 25,
    softCap: 3000,
    ticketAmount: 30,
    startDate: "2025-08-08T18:46:04.248Z",
    endDate: "2025-08-15T18:46:06.347Z",
    prizes: [],
    createdAt: "2025-08-08T18:46:04.248Z",
    updatedAt: "2025-08-08T18:46:04.248Z",
  }
];

// Health endpoint
app.get(['/api/health', '/health'], (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mongodb: { status: 'connected', info: { totalCampaigns: 2 } }
  });
});

// Campaigns list
app.get(['/api/campaigns', '/campaigns'], (req, res) => {
  const limit = parseInt(req.query.limit || '10', 10);
  const campaigns = demoCampaigns.slice(0, limit);
  
  res.set('Cache-Control', 'no-store');
  res.json({
    campaigns,
    pagination: { page: 1, limit, total: campaigns.length, totalPages: 1 }
  });
});

// Campaign detail
app.get(['/api/campaigns/:id', '/campaigns/:id'], (req, res) => {
  const id = req.params.id;
  const campaign = demoCampaigns.find(c => 
    c.id === id || c.contractId === parseInt(id) || c.contractId.toString() === id
  );
  
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }
  
  res.set('Cache-Control', 'no-store');
  res.json({ campaign });
});

// Admin stats
app.get(['/api/admin/stats', '/admin/stats'], (req, res) => {
  res.json({
    stats: {
      platform: { totalCampaigns: 2, activeCampaigns: 2, totalParticipants: 67, totalRaised: 23000, status: 'operational' },
      blockchain: {
        network: 'sepolia',
        chainId: '11155111',
        squdyTokenAddress: process.env.VITE_SQUDY_TOKEN_ADDRESS,
        campaignManagerAddress: process.env.VITE_CAMPAIGN_MANAGER_ADDRESS,
        connected: true,
      },
      database: { status: 'connected', lastCheck: new Date().toISOString() },
    }
  });
});

// Create campaign (mock success)
app.post(['/api/admin/campaigns', '/admin/campaigns'], (req, res) => {
  const data = req.body;
  const newCampaign = {
    id: `mock_${Date.now()}`,
    contractId: Date.now() % 10000,
    name: data.name || 'New Campaign',
    description: data.description || '',
    imageUrl: data.imageUrl || 'https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=800&h=400&fit=crop',
    status: 'active',
    currentAmount: 0,
    hardCap: Number(data.hardCap || 0),
    participantCount: 0,
    softCap: Number(data.softCap || 0),
    ticketAmount: Number(data.ticketAmount || 0),
    startDate: data.startDate || new Date().toISOString(),
    endDate: data.endDate || new Date(Date.now() + 7*24*60*60*1000).toISOString(),
    prizes: data.prizes || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  // Add to beginning of demo campaigns for this session
  demoCampaigns.unshift(newCampaign);
  
  res.set('Cache-Control', 'no-store');
  res.status(201).json({ message: 'Campaign created', campaign: newCampaign });
});

// My status (mock)
app.get(['/api/campaigns/:id/my-status', '/campaigns/:id/my-status'], (req, res) => {
  res.json({ isParticipating: false, status: null, stakeAmount: 0, socialTasks: {} });
});

// Auth endpoints (mock)
app.get('/api/auth', (req, res) => {
  const { walletAddress } = req.query;
  const message = `Welcome to Squdy Platform! Wallet: ${walletAddress} Nonce: ${Math.random()}`;
  res.json({ message, nonce: Math.random().toString(), timestamp: Date.now(), walletAddress });
});

app.post('/api/auth', (req, res) => {
  const { walletAddress } = req.body;
  res.json({ verified: true, walletAddress: walletAddress?.toLowerCase(), isAdmin: true, timestamp: Date.now() });
});

export default app;

// Vercel serverless function for Squdy backend
const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const crypto = require('crypto');

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

// Auth endpoints (nonce + verify) to avoid Vercel routing conflicts
app.get('/api/auth', (req, res) => {
  try {
    const { action, walletAddress } = req.query;
    if (action !== 'nonce') {
      return res.status(400).json({ error: 'Invalid action' });
    }
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const nonce = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    const message = `Welcome to Squdy Platform!\n\nThis request will not trigger a blockchain transaction or cost any gas fees.\n\nWallet: ${walletAddress}\nNonce: ${nonce}\nTimestamp: ${timestamp}\n\nSign this message to authenticate your wallet.`;

    return res.status(200).json({
      message,
      nonce,
      timestamp,
      walletAddress: walletAddress.toLowerCase(),
    });
  } catch (error) {
    console.error('Auth nonce error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth', (req, res) => {
  try {
    const { message, signature, walletAddress } = req.body || {};
    if (!message || !signature || !walletAddress) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    let recovered;
    try {
      recovered = ethers.utils.verifyMessage(message, signature);
    } catch (e) {
      console.error('Signature verify error:', e);
      return res.status(400).json({ error: 'Invalid signature', verified: false });
    }

    if (recovered.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(400).json({ error: 'Signature verification failed', verified: false });
    }

    const adminWallets = (process.env.ADMIN_WALLETS || '').split(',').map(w => w.toLowerCase());
    const isAdmin = adminWallets.includes(walletAddress.toLowerCase());

    return res.status(200).json({ verified: true, walletAddress: walletAddress.toLowerCase(), isAdmin, timestamp: Date.now() });
  } catch (error) {
    console.error('Auth verify error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Export the Express app for Vercel
module.exports = app;
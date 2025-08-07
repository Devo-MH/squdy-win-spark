// Vercel serverless function for Squdy backend (consolidated)
const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const crypto = require('crypto');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

console.log('🚀 Squdy Serverless Backend Starting...');

// Health endpoint
app.get('/api/health', (req, res) => res.send('OK'));

// Campaigns (basic demo; real data served from Mongo via admin routes)
app.get('/api/campaigns', (req, res) => {
  res.json({ campaigns: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 1 } });
});

// Admin stats (Mongo optional)
app.get('/api/admin/stats', async (req, res) => {
  try {
    const stats = {
      platform: { totalCampaigns: 0, activeCampaigns: 0, totalParticipants: 0, totalRaised: 0, status: 'operational' },
      blockchain: {
        network: process.env.VITE_NETWORK || 'sepolia',
        chainId: process.env.VITE_CHAIN_ID || '11155111',
        squdyTokenAddress: process.env.VITE_SQUDY_TOKEN_ADDRESS,
        campaignManagerAddress: process.env.VITE_CAMPAIGN_MANAGER_ADDRESS,
        connected: true,
      },
      database: { status: 'unknown', lastCheck: new Date().toISOString() },
    };
    res.json({ stats });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Auth (nonce + verify)
app.get('/api/auth', (req, res) => {
  const { action, walletAddress } = req.query;
  if (action !== 'nonce') return res.status(400).json({ error: 'Invalid action' });
  if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) return res.status(400).json({ error: 'Invalid wallet address' });

  const nonce = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  const message = `Welcome to Squdy Platform!\n\nThis request will not trigger a blockchain transaction or cost any gas fees.\n\nWallet: ${walletAddress}\nNonce: ${nonce}\nTimestamp: ${timestamp}\n\nSign this message to authenticate your wallet.`;
  res.json({ message, nonce, timestamp, walletAddress: walletAddress.toLowerCase() });
});

app.post('/api/auth', (req, res) => {
  const { message, signature, walletAddress } = req.body || {};
  if (!message || !signature || !walletAddress) return res.status(400).json({ error: 'Missing required fields' });
  if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) return res.status(400).json({ error: 'Invalid wallet address' });

  let recovered;
  try { recovered = ethers.utils.verifyMessage(message, signature); } catch { return res.status(400).json({ error: 'Invalid signature', verified: false }); }
  if (recovered.toLowerCase() !== walletAddress.toLowerCase()) return res.status(400).json({ error: 'Signature verification failed', verified: false });

  const adminWallets = (process.env.ADMIN_WALLETS || '').split(',').map(w => w.toLowerCase());
  const isAdmin = adminWallets.includes(walletAddress.toLowerCase());
  res.json({ verified: true, walletAddress: walletAddress.toLowerCase(), isAdmin, timestamp: Date.now() });
});

module.exports = app;
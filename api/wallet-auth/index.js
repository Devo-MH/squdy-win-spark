// Vercel serverless function: Wallet Auth API (renamed to avoid routing conflicts)
import crypto from 'crypto';
import { ethers } from 'ethers';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { method, query, body } = req;

  try {
    if (method === 'GET' && query.action === 'nonce') {
      const { walletAddress } = query;
      if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        return res.status(400).json({ error: 'Invalid wallet address' });
      }

      const nonce = crypto.randomBytes(16).toString('hex');
      const timestamp = Date.now();
      const message = `Welcome to Squdy Platform!\n\nThis request will not trigger a blockchain transaction or cost any gas fees.\n\nWallet: ${walletAddress}\nNonce: ${nonce}\nTimestamp: ${timestamp}\n\nSign this message to authenticate your wallet.`;

      return res.status(200).json({ message, nonce, timestamp, walletAddress: walletAddress.toLowerCase() });
    }

    if (method === 'POST') {
      const { message, signature, walletAddress } = body || {};
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
        return res.status(400).json({ error: 'Invalid signature', verified: false });
      }

      if (recovered.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(400).json({ error: 'Signature verification failed', verified: false });
      }

      const adminWallets = (process.env.ADMIN_WALLETS || '').split(',').map(w => w.toLowerCase());
      const isAdmin = adminWallets.includes(walletAddress.toLowerCase());

      return res.status(200).json({ verified: true, walletAddress: walletAddress.toLowerCase(), isAdmin, timestamp: Date.now() });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Wallet Auth API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}



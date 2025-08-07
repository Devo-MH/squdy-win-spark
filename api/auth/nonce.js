// Vercel serverless function: Get nonce for wallet authentication
import crypto from 'crypto';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { walletAddress } = req.query;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    // Validate wallet address format
    if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({ error: 'Invalid wallet address format' });
    }

    // Generate nonce and timestamp
    const nonce = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();

    // Create authentication message
    const message = `Welcome to Squdy Platform!

This request will not trigger a blockchain transaction or cost any gas fees.

Wallet: ${walletAddress}
Nonce: ${nonce}
Timestamp: ${timestamp}

Sign this message to authenticate your wallet.`;

    console.log(`🔐 Generated nonce for ${walletAddress}: ${nonce}`);

    return res.status(200).json({
      message,
      nonce,
      timestamp,
      walletAddress: walletAddress.toLowerCase()
    });

  } catch (error) {
    console.error('Error generating nonce:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

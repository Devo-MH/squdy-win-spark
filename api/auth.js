// Vercel serverless function: Combined Auth API
const crypto = require('crypto');
const { ethers } = require('ethers');

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { method, url, query, body } = req;

  try {
    // Handle nonce requests: GET /api/auth?action=nonce&walletAddress=0x...
    if (method === 'GET' && query.action === 'nonce') {
      const { walletAddress } = query;

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
    }

    // Handle signature verification: POST /api/auth with body
    if (method === 'POST') {
      const { message, signature, walletAddress } = body;

      if (!message || !signature || !walletAddress) {
        return res.status(400).json({ 
          error: 'Missing required fields: message, signature, walletAddress' 
        });
      }

      // Validate wallet address format
      if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
        return res.status(400).json({ error: 'Invalid wallet address format' });
      }

      console.log(`🔐 Verifying signature for ${walletAddress}`);

      // Verify the signature
      try {
        const recoveredAddress = ethers.utils.verifyMessage(message, signature);
        
        if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
          console.log(`❌ Signature verification failed: ${recoveredAddress} !== ${walletAddress}`);
          return res.status(400).json({ 
            error: 'Signature verification failed',
            verified: false 
          });
        }

        console.log(`✅ Signature verified for ${walletAddress}`);

        // Check if wallet is admin
        const adminWallets = (process.env.ADMIN_WALLETS || '').split(',').map(w => w.toLowerCase());
        const isAdmin = adminWallets.includes(walletAddress.toLowerCase());

        return res.status(200).json({
          verified: true,
          walletAddress: walletAddress.toLowerCase(),
          isAdmin,
          timestamp: Date.now()
        });

      } catch (signatureError) {
        console.error('Signature verification error:', signatureError);
        return res.status(400).json({ 
          error: 'Invalid signature',
          verified: false 
        });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Auth API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

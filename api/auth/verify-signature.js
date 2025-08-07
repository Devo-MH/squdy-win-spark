// Vercel serverless function: Verify wallet signature
import { ethers } from 'ethers';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, signature, walletAddress } = req.body;

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

  } catch (error) {
    console.error('Error verifying signature:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

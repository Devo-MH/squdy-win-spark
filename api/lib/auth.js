// Authentication middleware for Vercel serverless functions
import { ethers } from 'ethers';

// Check if wallet address is admin
export function isAdminWallet(walletAddress) {
  if (!walletAddress) return false;
  
  const adminWallets = (process.env.ADMIN_WALLETS || '').split(',').map(w => w.toLowerCase());
  return adminWallets.includes(walletAddress.toLowerCase());
}

// Verify wallet signature
export function verifyWalletSignature(message, signature, expectedAddress) {
  try {
    const recoveredAddress = ethers.utils.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

// Extract auth from request headers or body
export function extractAuthData(req) {
  // Try to get from Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      return JSON.parse(Buffer.from(token, 'base64').toString());
    } catch (error) {
      console.error('Error parsing auth header:', error);
    }
  }

  // Try to get from request body
  if (req.body && req.body.auth) {
    return req.body.auth;
  }

  return null;
}

// Middleware to require authentication
export function requireAuth(handler) {
  return async (req, res) => {
    try {
      const authData = extractAuthData(req);
      
      if (!authData || !authData.walletAddress || !authData.signature || !authData.message) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Verify signature
      if (!verifyWalletSignature(authData.message, authData.signature, authData.walletAddress)) {
        return res.status(401).json({ error: 'Invalid signature' });
      }

      // Add wallet info to request
      req.wallet = {
        address: authData.walletAddress.toLowerCase(),
        isAdmin: isAdminWallet(authData.walletAddress)
      };

      return handler(req, res);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(500).json({ error: 'Authentication error' });
    }
  };
}

// Middleware to require admin access
export function requireAdmin(handler) {
  return requireAuth(async (req, res) => {
    if (!req.wallet.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    return handler(req, res);
  });
}

// Helper to add CORS headers
export function addCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

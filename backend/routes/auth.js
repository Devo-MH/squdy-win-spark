const express = require('express');
const { User } = require('../models');
const { generateToken, authenticateToken } = require('../middleware/auth');
const { validateRequest, userUpdateSchema } = require('../middleware/validation');
const router = express.Router();

// Connect wallet and create/login user
router.post('/connect', async (req, res) => {
  try {
    const { walletAddress, signature, message } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address format' });
    }

    // Find or create user
    let user = await User.findOne({ where: { walletAddress } });
    
    if (!user) {
      user = await User.create({
        walletAddress,
        lastLoginAt: new Date(),
      });
    } else {
      await user.update({ lastLoginAt: new Date() });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage,
        socialProfiles: user.socialProfiles,
        preferences: user.preferences,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (error) {
    console.error('Auth connect error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    res.json({
      success: true,
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage,
        socialProfiles: user.socialProfiles,
        preferences: user.preferences,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, validateRequest(userUpdateSchema), async (req, res) => {
  try {
    const user = req.user;
    const updates = req.body;

    // Check if username is taken (if updating username)
    if (updates.username && updates.username !== user.username) {
      const existingUser = await User.findOne({ 
        where: { username: updates.username } 
      });
      
      if (existingUser) {
        return res.status(400).json({ error: 'Username already taken' });
      }
    }

    // Check if email is taken (if updating email)
    if (updates.email && updates.email !== user.email) {
      const existingUser = await User.findOne({ 
        where: { email: updates.email } 
      });
      
      if (existingUser) {
        return res.status(400).json({ error: 'Email already registered' });
      }
    }

    await user.update(updates);

    res.json({
      success: true,
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage,
        socialProfiles: user.socialProfiles,
        preferences: user.preferences,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout (invalidate token - client-side action)
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // In a more sophisticated setup, you might maintain a token blacklist
    // For now, we just return success and let the client remove the token
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
const express = require('express');
const { Stake, Campaign, User } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { validateRequest, stakeSchema } = require('../middleware/validation');
const router = express.Router();

// Get user's stakes
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { campaignId, status, limit = 10, offset = 0 } = req.query;

    const whereClause = { userId };
    if (campaignId) whereClause.campaignId = campaignId;
    if (status) whereClause.status = status;

    const stakes = await Stake.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Campaign,
          as: 'campaign',
          attributes: ['id', 'title', 'imageUrl', 'status', 'endDate'],
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      stakes: stakes.rows,
      pagination: {
        total: stakes.count,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(stakes.count / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get stakes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new stake
router.post('/', authenticateToken, validateRequest(stakeSchema), async (req, res) => {
  try {
    const userId = req.user.id;
    const { campaignId, amount, transactionHash } = req.body;

    // Check if campaign exists and is active
    const campaign = await Campaign.findByPk(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (campaign.status !== 'active') {
      return res.status(400).json({ error: 'Campaign is not active' });
    }

    const now = new Date();
    if (now < campaign.startDate || now > campaign.endDate) {
      return res.status(400).json({ error: 'Campaign is not within active dates' });
    }

    // Check if user already has a stake in this campaign
    const existingStake = await Stake.findOne({
      where: { userId, campaignId },
    });

    if (existingStake) {
      return res.status(400).json({ error: 'User already has a stake in this campaign' });
    }

    // Check max participants limit
    if (campaign.maxParticipants && campaign.participantCount >= campaign.maxParticipants) {
      return res.status(400).json({ error: 'Campaign has reached maximum participants' });
    }

    // Calculate tickets based on campaign's ticket amount
    const tickets = Math.floor(amount / campaign.ticketAmount);

    // Create stake
    const stake = await Stake.create({
      userId,
      campaignId,
      amount,
      tickets,
      transactionHash,
      status: transactionHash ? 'confirmed' : 'pending',
    });

    // Update campaign totals if stake is confirmed
    if (stake.status === 'confirmed') {
      await campaign.increment({
        currentAmount: amount,
        participantCount: 1,
      });
    }

    const stakeWithCampaign = await Stake.findByPk(stake.id, {
      include: [
        {
          model: Campaign,
          as: 'campaign',
          attributes: ['id', 'title', 'imageUrl', 'status', 'endDate'],
        },
      ],
    });

    res.status(201).json({
      success: true,
      stake: stakeWithCampaign,
    });
  } catch (error) {
    console.error('Create stake error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update stake (mainly for confirming transactions)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { transactionHash, blockNumber, status } = req.body;

    const stake = await Stake.findByPk(id, {
      include: [
        {
          model: Campaign,
          as: 'campaign',
        },
      ],
    });

    if (!stake) {
      return res.status(404).json({ error: 'Stake not found' });
    }

    // Check ownership
    if (stake.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this stake' });
    }

    const oldStatus = stake.status;
    const updates = {};

    if (transactionHash) updates.transactionHash = transactionHash;
    if (blockNumber) updates.blockNumber = blockNumber;
    if (status) updates.status = status;

    await stake.update(updates);

    // Update campaign totals if status changed to confirmed
    if (oldStatus === 'pending' && status === 'confirmed') {
      await stake.campaign.increment({
        currentAmount: stake.amount,
        participantCount: 1,
      });
    }

    // Update campaign totals if status changed from confirmed to failed
    if (oldStatus === 'confirmed' && status === 'failed') {
      await stake.campaign.decrement({
        currentAmount: stake.amount,
        participantCount: 1,
      });
    }

    const updatedStake = await Stake.findByPk(id, {
      include: [
        {
          model: Campaign,
          as: 'campaign',
          attributes: ['id', 'title', 'imageUrl', 'status', 'endDate'],
        },
      ],
    });

    res.json({
      success: true,
      stake: updatedStake,
    });
  } catch (error) {
    console.error('Update stake error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get stake by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const stake = await Stake.findByPk(id, {
      include: [
        {
          model: Campaign,
          as: 'campaign',
          attributes: ['id', 'title', 'imageUrl', 'status', 'endDate', 'prizes'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'walletAddress', 'username'],
        },
      ],
    });

    if (!stake) {
      return res.status(404).json({ error: 'Stake not found' });
    }

    // Check ownership
    if (stake.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to view this stake' });
    }

    res.json({
      success: true,
      stake,
    });
  } catch (error) {
    console.error('Get stake error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete stake (only if pending)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const stake = await Stake.findByPk(id);

    if (!stake) {
      return res.status(404).json({ error: 'Stake not found' });
    }

    // Check ownership
    if (stake.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this stake' });
    }

    // Only allow deletion of pending stakes
    if (stake.status !== 'pending') {
      return res.status(400).json({ error: 'Can only delete pending stakes' });
    }

    await stake.destroy();

    res.json({
      success: true,
      message: 'Stake deleted successfully',
    });
  } catch (error) {
    console.error('Delete stake error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
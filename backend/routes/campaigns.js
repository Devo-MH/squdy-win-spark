const express = require('express');
const { Campaign, User, Stake, TaskSubmission } = require('../models');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { validateRequest, campaignSchema } = require('../middleware/validation');
const { Op } = require('sequelize');
const router = express.Router();

// Get all campaigns
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { 
      status, 
      limit = 10, 
      offset = 0, 
      sortBy = 'createdAt', 
      sortOrder = 'DESC' 
    } = req.query;

    const whereClause = {};
    if (status) {
      whereClause.status = status;
    }

    const campaigns = await Campaign.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'walletAddress', 'username'],
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder.toUpperCase()]],
    });

    // Add computed fields
    const campaignsWithStats = campaigns.rows.map(campaign => {
      const now = new Date();
      const isActive = campaign.status === 'active' && 
                      now >= campaign.startDate && 
                      now <= campaign.endDate;
      
      return {
        ...campaign.toJSON(),
        isActive,
        timeLeft: isActive ? Math.max(0, campaign.endDate - now) : 0,
        progress: campaign.targetAmount > 0 ? 
          (campaign.currentAmount / campaign.targetAmount) * 100 : 0,
      };
    });

    res.json({
      success: true,
      campaigns: campaignsWithStats,
      pagination: {
        total: campaigns.count,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(campaigns.count / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single campaign
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await Campaign.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'walletAddress', 'username'],
        },
        {
          model: Stake,
          as: 'stakes',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'walletAddress', 'username'],
            },
          ],
        },
        {
          model: TaskSubmission,
          as: 'taskSubmissions',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'walletAddress', 'username'],
            },
          ],
        },
      ],
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Add computed fields
    const now = new Date();
    const isActive = campaign.status === 'active' && 
                    now >= campaign.startDate && 
                    now <= campaign.endDate;

    const campaignData = {
      ...campaign.toJSON(),
      isActive,
      timeLeft: isActive ? Math.max(0, campaign.endDate - now) : 0,
      progress: campaign.targetAmount > 0 ? 
        (campaign.currentAmount / campaign.targetAmount) * 100 : 0,
    };

    res.json({
      success: true,
      campaign: campaignData,
    });
  } catch (error) {
    console.error('Get campaign error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new campaign
router.post('/', authenticateToken, validateRequest(campaignSchema), async (req, res) => {
  try {
    const campaignData = {
      ...req.body,
      createdBy: req.user.id,
    };

    const campaign = await Campaign.create(campaignData);

    const campaignWithCreator = await Campaign.findByPk(campaign.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'walletAddress', 'username'],
        },
      ],
    });

    res.status(201).json({
      success: true,
      campaign: campaignWithCreator,
    });
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update campaign
router.put('/:id', authenticateToken, validateRequest(campaignSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const campaign = await Campaign.findByPk(id);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Check ownership
    if (campaign.createdBy !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this campaign' });
    }

    // Don't allow updates to active or finished campaigns
    if (['active', 'finished', 'winners_selected'].includes(campaign.status)) {
      return res.status(400).json({ 
        error: 'Cannot update campaign that is active, finished, or has winners selected' 
      });
    }

    await campaign.update(req.body);

    const updatedCampaign = await Campaign.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'walletAddress', 'username'],
        },
      ],
    });

    res.json({
      success: true,
      campaign: updatedCampaign,
    });
  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete campaign
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const campaign = await Campaign.findByPk(id);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Check ownership
    if (campaign.createdBy !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this campaign' });
    }

    // Don't allow deletion of active campaigns with stakes
    if (campaign.status === 'active' && campaign.currentAmount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete active campaign with existing stakes' 
      });
    }

    await campaign.destroy();

    res.json({
      success: true,
      message: 'Campaign deleted successfully',
    });
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Select winners for campaign
router.post('/:id/select-winners', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const campaign = await Campaign.findByPk(id, {
      include: [
        {
          model: Stake,
          as: 'stakes',
          where: { status: 'confirmed' },
          required: false,
        },
      ],
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Check ownership
    if (campaign.createdBy !== userId) {
      return res.status(403).json({ error: 'Not authorized to select winners for this campaign' });
    }

    // Check if campaign is finished
    if (campaign.status !== 'finished') {
      return res.status(400).json({ error: 'Can only select winners for finished campaigns' });
    }

    // Select random winners based on ticket weight
    const stakes = campaign.stakes;
    const totalTickets = stakes.reduce((sum, stake) => sum + stake.tickets, 0);
    
    if (totalTickets === 0) {
      return res.status(400).json({ error: 'No valid stakes found for winner selection' });
    }

    const winners = [];
    const prizeCount = campaign.prizes.length;
    const usedStakes = new Set();

    for (let i = 0; i < Math.min(prizeCount, stakes.length); i++) {
      let randomTicket = Math.floor(Math.random() * totalTickets);
      
      for (const stake of stakes) {
        if (usedStakes.has(stake.id)) continue;
        
        if (randomTicket < stake.tickets) {
          winners.push({
            place: i + 1,
            userId: stake.userId,
            stakeId: stake.id,
            tickets: stake.tickets,
            prize: campaign.prizes[i],
          });
          usedStakes.add(stake.id);
          break;
        }
        randomTicket -= stake.tickets;
      }
    }

    await campaign.update({
      status: 'winners_selected',
      winners,
    });

    res.json({
      success: true,
      winners,
      message: `Selected ${winners.length} winners`,
    });
  } catch (error) {
    console.error('Select winners error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Burn campaign tokens
router.post('/:id/burn-tokens', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const campaign = await Campaign.findByPk(id);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Check ownership
    if (campaign.createdBy !== userId) {
      return res.status(403).json({ error: 'Not authorized to burn tokens for this campaign' });
    }

    // Check if winners have been selected
    if (campaign.status !== 'winners_selected') {
      return res.status(400).json({ error: 'Can only burn tokens after winners are selected' });
    }

    // In a real implementation, this would interact with the smart contract
    // For now, we just mark the campaign as completed
    await campaign.update({
      metadata: {
        ...campaign.metadata,
        tokensBurned: true,
        burnedAt: new Date().toISOString(),
        burnedAmount: campaign.currentAmount,
      },
    });

    res.json({
      success: true,
      message: `Burned ${campaign.currentAmount} SQUDY tokens`,
      burnedAmount: campaign.currentAmount,
    });
  } catch (error) {
    console.error('Burn tokens error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
import { Request, Response, NextFunction } from 'express';
import Campaign from '@/models/Campaign';
import Participant from '@/models/Participant';
import Web3Service from '@/services/Web3Service';
import { AuthenticatedRequest } from '@/middleware/auth';
import { createError } from '@/middleware/errorHandler';
import logger from '@/utils/logger';

class AdminController {
  // Get admin dashboard data
  static async getDashboard(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const [campaigns, participants, stats] = await Promise.all([
        Campaign.find().sort({ createdAt: -1 }).limit(5).lean(),
        Participant.find().sort({ joinedAt: -1 }).limit(10).lean(),
        AdminController.getPlatformStats(),
      ]);

      res.json({
        recentCampaigns: campaigns,
        recentParticipants: participants,
        stats,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get platform statistics
  static async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await AdminController.getPlatformStats();
      res.json({ stats });
    } catch (error) {
      next(error);
    }
  }

  // Create new campaign
  static async createCampaign(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        name,
        description,
        softCap,
        hardCap,
        ticketAmount,
        startDate,
        endDate,
        prizes,
        socialRequirements,
      } = req.body;

      // Validate campaign data
      if (hardCap <= softCap) {
        res.status(400).json({
          error: {
            message: 'Hard cap must be greater than soft cap',
            statusCode: 400,
          },
        });
        return;
      }

      if (new Date(startDate) <= new Date()) {
        res.status(400).json({
          error: {
            message: 'Start date must be in the future',
            statusCode: 400,
          },
        });
        return;
      }

      if (new Date(endDate) <= new Date(startDate)) {
        res.status(400).json({
          error: {
            message: 'End date must be after start date',
            statusCode: 400,
          },
        });
        return;
      }

      // Get next campaign ID
      const lastCampaign = await Campaign.findOne().sort({ contractId: -1 });
      const contractId = lastCampaign ? lastCampaign.contractId + 1 : 1;

      // Create campaign
      const campaign = new Campaign({
        contractId,
        name,
        description,
        imageUrl: req.body.imageUrl || 'https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=400&h=300&fit=crop',
        softCap,
        hardCap,
        ticketAmount,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        prizes: prizes || [],
        socialRequirements: socialRequirements || {},
        status: 'pending',
      });

      await campaign.save();

      logger.info(`Admin created campaign: ${name} (ID: ${contractId})`);

      res.status(201).json({
        message: 'Campaign created successfully',
        campaign: {
          id: campaign._id,
          contractId: campaign.contractId,
          name: campaign.name,
          status: campaign.status,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Update campaign
  static async updateCampaign(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const campaign = await Campaign.findOne({ contractId: Number(id) });
      
      if (!campaign) {
        res.status(404).json({
          error: {
            message: 'Campaign not found',
            statusCode: 404,
          },
        });
        return;
      }

      // Only allow updates for pending campaigns
      if (campaign.status !== 'pending') {
        res.status(400).json({
          error: {
            message: 'Can only update pending campaigns',
            statusCode: 400,
          },
        });
        return;
      }

      // Update allowed fields
      const allowedFields = ['name', 'description', 'imageUrl', 'prizes', 'socialRequirements'];
      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          (campaign as any)[field] = updateData[field];
        }
      }

      await campaign.save();

      logger.info(`Admin updated campaign: ${campaign.name} (ID: ${id})`);

      res.json({
        message: 'Campaign updated successfully',
        campaign: {
          id: campaign._id,
          contractId: campaign.contractId,
          name: campaign.name,
          status: campaign.status,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Upload campaign image
  static async uploadCampaignImage(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { imageUrl } = req.body;

      const campaign = await Campaign.findOne({ contractId: Number(id) });
      
      if (!campaign) {
        res.status(404).json({
          error: {
            message: 'Campaign not found',
            statusCode: 404,
          },
        });
        return;
      }

      campaign.imageUrl = imageUrl;
      await campaign.save();

      logger.info(`Admin uploaded image for campaign: ${campaign.name} (ID: ${id})`);

      res.json({
        message: 'Campaign image uploaded successfully',
        imageUrl: campaign.imageUrl,
      });
    } catch (error) {
      next(error);
    }
  }

  // Activate campaign
  static async activateCampaign(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const campaign = await Campaign.findOne({ contractId: Number(id) });
      
      if (!campaign) {
        res.status(404).json({
          error: {
            message: 'Campaign not found',
            statusCode: 404,
          },
        });
        return;
      }

      if (campaign.status !== 'pending') {
        res.status(400).json({
          error: {
            message: 'Can only activate pending campaigns',
            statusCode: 400,
          },
        });
        return;
      }

      if (new Date() < campaign.startDate) {
        res.status(400).json({
          error: {
            message: 'Cannot activate campaign before start date',
            statusCode: 400,
          },
        });
        return;
      }

      campaign.status = 'active';
      await campaign.save();

      logger.info(`Admin activated campaign: ${campaign.name} (ID: ${id})`);

      res.json({
        message: 'Campaign activated successfully',
        campaign: {
          id: campaign._id,
          contractId: campaign.contractId,
          name: campaign.name,
          status: campaign.status,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Pause campaign
  static async pauseCampaign(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const campaign = await Campaign.findOne({ contractId: Number(id) });
      
      if (!campaign) {
        res.status(404).json({
          error: {
            message: 'Campaign not found',
            statusCode: 404,
          },
        });
        return;
      }

      if (campaign.status !== 'active') {
        res.status(400).json({
          error: {
            message: 'Can only pause active campaigns',
            statusCode: 400,
          },
        });
        return;
      }

      campaign.status = 'paused';
      await campaign.save();

      logger.info(`Admin paused campaign: ${campaign.name} (ID: ${id})`);

      res.json({
        message: 'Campaign paused successfully',
        campaign: {
          id: campaign._id,
          contractId: campaign.contractId,
          name: campaign.name,
          status: campaign.status,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Close campaign
  static async closeCampaign(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const campaign = await Campaign.findOne({ contractId: Number(id) });
      
      if (!campaign) {
        res.status(404).json({
          error: {
            message: 'Campaign not found',
            statusCode: 404,
          },
        });
        return;
      }

      if (campaign.status !== 'active' && campaign.status !== 'paused') {
        res.status(400).json({
          error: {
            message: 'Can only close active or paused campaigns',
            statusCode: 400,
          },
        });
        return;
      }

      if (new Date() < campaign.endDate) {
        res.status(400).json({
          error: {
            message: 'Cannot close campaign before end date',
            statusCode: 400,
          },
        });
        return;
      }

      campaign.status = 'finished';
      await campaign.save();

      logger.info(`Admin closed campaign: ${campaign.name} (ID: ${id})`);

      res.json({
        message: 'Campaign closed successfully',
        campaign: {
          id: campaign._id,
          contractId: campaign.contractId,
          name: campaign.name,
          status: campaign.status,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Select winners
  static async selectWinners(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const campaign = await Campaign.findOne({ contractId: Number(id) });
      
      if (!campaign) {
        res.status(404).json({
          error: {
            message: 'Campaign not found',
            statusCode: 404,
          },
        });
        return;
      }

      if (campaign.status !== 'finished') {
        res.status(400).json({
          error: {
            message: 'Can only select winners for finished campaigns',
            statusCode: 400,
          },
        });
        return;
      }

      // This would trigger the blockchain winner selection
      // For now, we'll just update the status
      logger.info(`Admin initiated winner selection for campaign: ${campaign.name} (ID: ${id})`);

      res.json({
        message: 'Winner selection initiated',
        campaign: {
          id: campaign._id,
          contractId: campaign.contractId,
          name: campaign.name,
          status: campaign.status,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Burn tokens
  static async burnTokens(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const campaign = await Campaign.findOne({ contractId: Number(id) });
      
      if (!campaign) {
        res.status(404).json({
          error: {
            message: 'Campaign not found',
            statusCode: 404,
          },
        });
        return;
      }

      if (campaign.status !== 'finished') {
        res.status(400).json({
          error: {
            message: 'Can only burn tokens for finished campaigns',
            statusCode: 400,
          },
        });
        return;
      }

      if (campaign.winners.length === 0) {
        res.status(400).json({
          error: {
            message: 'Winners must be selected before burning tokens',
            statusCode: 400,
          },
        });
        return;
      }

      // This would trigger the blockchain token burning
      // For now, we'll just update the status
      campaign.status = 'burned';
      campaign.totalBurned = campaign.currentAmount;
      await campaign.save();

      logger.info(`Admin burned tokens for campaign: ${campaign.name} (ID: ${id})`);

      res.json({
        message: 'Tokens burned successfully',
        campaign: {
          id: campaign._id,
          contractId: campaign.contractId,
          name: campaign.name,
          status: campaign.status,
          totalBurned: campaign.totalBurned,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Get platform statistics
  private static async getPlatformStats() {
    const [
      totalCampaigns,
      activeCampaigns,
      totalParticipants,
      totalStaked,
      totalBurned,
    ] = await Promise.all([
      Campaign.countDocuments(),
      Campaign.countDocuments({ status: 'active' }),
      Participant.countDocuments(),
      Participant.aggregate([
        { $group: { _id: null, total: { $sum: '$stakedAmount' } } }
      ]),
      Campaign.aggregate([
        { $match: { status: 'burned' } },
        { $group: { _id: null, total: { $sum: '$totalBurned' } } }
      ]),
    ]);

    return {
      totalCampaigns,
      activeCampaigns,
      totalParticipants,
      totalStaked: totalStaked[0]?.total || 0,
      totalBurned: totalBurned[0]?.total || 0,
    };
  }
}

export default AdminController;
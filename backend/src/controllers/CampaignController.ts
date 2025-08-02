import { Request, Response, NextFunction } from 'express';
import Campaign from '@/models/Campaign';
import Participant from '@/models/Participant';
import Web3Service from '@/services/Web3Service';
import { createError } from '@/middleware/errorHandler';
import { AuthenticatedRequest } from '@/middleware/auth';
import logger from '@/utils/logger';

class CampaignController {
  // Get all campaigns with filters
  static async getCampaigns(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, page = 1, limit = 10 } = req.query;
      
      const filter: any = {};
      if (status) {
        filter.status = status;
      }

      const skip = (Number(page) - 1) * Number(limit);
      
      const [campaigns, total] = await Promise.all([
        Campaign.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        Campaign.countDocuments(filter)
      ]);

      const totalPages = Math.ceil(total / Number(limit));

      res.json({
        campaigns,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Get campaign by ID
  static async getCampaignById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      const campaign = await Campaign.findOne({ contractId: Number(id) }).lean();
      
      if (!campaign) {
        res.status(404).json({
          error: {
            message: 'Campaign not found',
            statusCode: 404,
          },
        });
        return;
      }

      // Try to get real-time data from blockchain
      try {
        const blockchainData = await Web3Service.getCampaign(Number(id));
        
        // Merge blockchain data with database data
        const mergedCampaign = {
          ...campaign,
          currentAmount: blockchainData.currentAmount,
          participantCount: blockchainData.participantCount,
          status: blockchainData.status,
          winners: blockchainData.winners,
          totalBurned: blockchainData.totalBurned,
        };

        res.json({ campaign: mergedCampaign });
      } catch (blockchainError) {
        logger.warn(`Failed to get blockchain data for campaign ${id}:`, blockchainError);
        // Return database data only
        res.json({ campaign });
      }
    } catch (error) {
      next(error);
    }
  }

  // Get campaign participants
  static async getCampaignParticipants(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20 } = req.query;
      
      const skip = (Number(page) - 1) * Number(limit);
      
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

      const [participants, total] = await Promise.all([
        Participant.find({ campaignId: campaign._id })
          .sort({ joinedAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .select('-__v')
          .lean(),
        Participant.countDocuments({ campaignId: campaign._id })
      ]);

      const totalPages = Math.ceil(total / Number(limit));

      res.json({
        participants,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Get campaign winners
  static async getCampaignWinners(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      const campaign = await Campaign.findOne({ contractId: Number(id) }).lean();
      
      if (!campaign) {
        res.status(404).json({
          error: {
            message: 'Campaign not found',
            statusCode: 404,
          },
        });
        return;
      }

      if (campaign.status !== 'finished' && campaign.status !== 'burned') {
        res.status(400).json({
          error: {
            message: 'Campaign has not finished yet',
            statusCode: 400,
          },
        });
        return;
      }

      res.json({ winners: campaign.winners || [] });
    } catch (error) {
      next(error);
    }
  }

  // Participate in campaign
  static async participateInCampaign(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { stakeAmount, stakeTxHash } = req.body;
      const { walletAddress } = req;

      if (!walletAddress) {
        res.status(401).json({
          error: {
            message: 'Wallet address required',
            statusCode: 401,
          },
        });
        return;
      }

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
            message: 'Campaign is not active',
            statusCode: 400,
          },
        });
        return;
      }

      // Check if user already participated
      const existingParticipant = await Participant.findOne({
        campaignId: campaign._id,
        walletAddress: walletAddress.toLowerCase(),
      });
      
      if (existingParticipant) {
        res.status(409).json({
          error: {
            message: 'Already participated in this campaign',
            statusCode: 409,
          },
        });
        return;
      }

      // Calculate ticket count
      const ticketCount = Math.floor(stakeAmount / campaign.ticketAmount);
      if (ticketCount < 1) {
        res.status(400).json({
          error: {
            message: 'Stake amount must be at least one ticket worth',
            statusCode: 400,
          },
        });
        return;
      }

      // Create participant record
      const participant = new Participant({
        walletAddress: walletAddress.toLowerCase(),
        campaignId: campaign._id,
        stakeTxHash,
        ticketCount,
        stakedAmount: stakeAmount,
      });
      
      await participant.save();

      // Update campaign participant count
      campaign.participantCount += 1;
      campaign.currentAmount += stakeAmount;
      await campaign.save();

      logger.info(`User ${walletAddress} participated in campaign ${id} with ${stakeAmount} SQUDY`);

      res.status(201).json({
        message: 'Successfully participated in campaign',
        participant: {
          ticketCount,
          stakedAmount: stakeAmount,
          joinedAt: participant.joinedAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Verify social media task
  static async verifySocialTask(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { taskType, proof } = req.body;
      const { walletAddress } = req;

      if (!walletAddress) {
        res.status(401).json({
          error: {
            message: 'Wallet address required',
            statusCode: 401,
          },
        });
        return;
      }

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

      const participant = await Participant.findOne({
        campaignId: campaign._id,
        walletAddress: walletAddress.toLowerCase(),
      });
      
      if (!participant) {
        res.status(404).json({
          error: {
            message: 'Not participating in this campaign',
            statusCode: 404,
          },
        });
        return;
      }

      // Verify the social task (this would integrate with social media APIs)
      const isVerified = await CampaignController.verifySocialMediaTask(taskType, proof, walletAddress);
      
      if (!isVerified) {
        res.status(400).json({
          error: {
            message: 'Social task verification failed',
            statusCode: 400,
          },
        });
        return;
      }

      // Update participant's social task completion
      (participant.socialTasksCompleted as any)[taskType] = true;
      await participant.save();

      logger.info(`User ${walletAddress} completed ${taskType} for campaign ${id}`);

      res.json({
        message: 'Social task verified successfully',
        taskType,
        allTasksCompleted: participant.allSocialTasksCompleted,
        completionPercentage: participant.socialCompletionPercentage,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get user's participation status
  static async getMyStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { walletAddress } = req;

      if (!walletAddress) {
        res.status(401).json({
          error: {
            message: 'Wallet address required',
            statusCode: 401,
          },
        });
        return;
      }

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

      const participant = await Participant.findOne({
        campaignId: campaign._id,
        walletAddress: walletAddress.toLowerCase(),
      });
      
      if (!participant) {
        res.json({
          isParticipating: false,
          status: null,
        });
        return;
      }

      // Get blockchain data for real-time status
      try {
        const blockchainParticipant = await Web3Service.getParticipant(Number(id), walletAddress);
        
        res.json({
          isParticipating: true,
          status: {
            ticketCount: participant.ticketCount,
            stakedAmount: participant.stakedAmount,
            socialTasksCompleted: participant.socialTasksCompleted,
            allTasksCompleted: participant.allSocialTasksCompleted,
            completionPercentage: participant.socialCompletionPercentage,
            isWinner: blockchainParticipant.isWinner,
            prizeIndex: blockchainParticipant.prizeIndex,
            joinedAt: participant.joinedAt,
          },
        });
      } catch (blockchainError) {
        logger.warn(`Failed to get blockchain participant data:`, blockchainError);
        
        res.json({
          isParticipating: true,
          status: {
            ticketCount: participant.ticketCount,
            stakedAmount: participant.stakedAmount,
            socialTasksCompleted: participant.socialTasksCompleted,
            allTasksCompleted: participant.allSocialTasksCompleted,
            completionPercentage: participant.socialCompletionPercentage,
            isWinner: participant.isWinner,
            prizeIndex: participant.prizeIndex,
            joinedAt: participant.joinedAt,
          },
        });
      }
    } catch (error) {
      next(error);
    }
  }

  // Verify social media task (placeholder implementation)
  private static async verifySocialMediaTask(taskType: string, proof: string, walletAddress: string): Promise<boolean> {
    // This is a placeholder implementation
    // In a real implementation, you would:
    // 1. Call Twitter API to verify follow/like/retweet
    // 2. Call Discord API to verify server membership
    // 3. Call Telegram API to verify group membership
    // 4. Verify Medium follow status
    // 5. Verify newsletter subscription
    
    logger.info(`Verifying ${taskType} for wallet ${walletAddress} with proof: ${proof}`);
    
    // For now, return true to simulate successful verification
    return true;
  }
}

export default CampaignController;
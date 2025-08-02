import { Request, Response, NextFunction } from 'express';
import Participant from '@/models/Participant';
import Campaign from '@/models/Campaign';
import { AuthenticatedRequest } from '@/middleware/auth';
import logger from '@/utils/logger';

class ParticipantController {
  // Get user's participations
  static async getMyParticipations(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { walletAddress } = req;
      const { page = 1, limit = 10 } = req.query;

      if (!walletAddress) {
        res.status(401).json({
          error: {
            message: 'Wallet address required',
            statusCode: 401,
          },
        });
      return;
      }

      const skip = (Number(page) - 1) * Number(limit);

      const [participations, total] = await Promise.all([
        Participant.find({ walletAddress: walletAddress.toLowerCase() })
          .populate('campaignId', 'contractId name description imageUrl status startDate endDate')
          .sort({ joinedAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        Participant.countDocuments({ walletAddress: walletAddress.toLowerCase() })
      ]);

      const totalPages = Math.ceil(total / Number(limit));

      res.json({
        participations,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages,
        },
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  // Get user's statistics
  static async getMyStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
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

      const participations = await Participant.find({ 
        walletAddress: walletAddress.toLowerCase() 
      }).populate('campaignId', 'status prizes');

      const stats = {
        totalParticipations: participations.length,
        activeParticipations: participations.filter(p => (p.campaignId as any).status === 'active').length,
        finishedParticipations: participations.filter(p => (p.campaignId as any).status === 'finished').length,
        totalStaked: participations.reduce((sum, p) => sum + p.stakedAmount, 0),
        totalTickets: participations.reduce((sum, p) => sum + p.ticketCount, 0),
        wins: participations.filter(p => p.isWinner).length,
        totalPrizesWon: participations.filter(p => p.isWinner).length,
        socialCompletionRate: 0,
      };

      // Calculate social completion rate
      if (participations.length > 0) {
        const totalTasks = participations.length * 7; // 7 social tasks per campaign
        const completedTasks = participations.reduce((sum, p) => {
          const tasks = p.socialTasksCompleted;
          return sum + Object.values(tasks).filter(Boolean).length;
        }, 0);
        stats.socialCompletionRate = Math.round((completedTasks / totalTasks) * 100);
      }

      res.json({ stats });
      return;
    } catch (error) {
      next(error);
    }
  }
}

export default ParticipantController; 
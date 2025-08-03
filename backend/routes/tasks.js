const express = require('express');
const { TaskSubmission, Campaign, User } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { validateRequest, taskSubmissionSchema } = require('../middleware/validation');
const socialVerificationService = require('../services/socialVerification');
const router = express.Router();

// Get user's task submissions
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { campaignId, status, taskType, limit = 50, offset = 0 } = req.query;

    const whereClause = { userId };
    if (campaignId) whereClause.campaignId = campaignId;
    if (status) whereClause.status = status;
    if (taskType) whereClause.taskType = taskType;

    const submissions = await TaskSubmission.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Campaign,
          as: 'campaign',
          attributes: ['id', 'title', 'status'],
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      submissions: submissions.rows,
      pagination: {
        total: submissions.count,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(submissions.count / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get task submissions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit task for verification
router.post('/', authenticateToken, validateRequest(taskSubmissionSchema), async (req, res) => {
  try {
    const userId = req.user.id;
    const { campaignId, taskId, submissionData = {} } = req.body;

    // Check if campaign exists and is active
    const campaign = await Campaign.findByPk(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (campaign.status !== 'active') {
      return res.status(400).json({ error: 'Campaign is not active' });
    }

    // Find the task in campaign's offchain tasks
    const task = campaign.offchainTasks.find(t => t.id === taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found in campaign' });
    }

    // Check if user already submitted this task
    const existingSubmission = await TaskSubmission.findOne({
      where: { userId, campaignId, taskId },
    });

    if (existingSubmission) {
      return res.status(400).json({ error: 'Task already submitted' });
    }

    // Create task submission
    const submission = await TaskSubmission.create({
      userId,
      campaignId,
      taskId,
      taskType: task.type,
      submissionData,
      status: 'pending',
    });

    // Attempt automatic verification based on task type
    let verificationResult = { verified: false };

    try {
      switch (task.type) {
        case 'twitter_follow':
          if (submissionData.username && task.targetAccount) {
            verificationResult = await socialVerificationService.verifyTwitterFollow(
              submissionData.username,
              task.targetAccount
            );
          }
          break;

        case 'twitter_retweet':
          if (submissionData.username && task.tweetId) {
            verificationResult = await socialVerificationService.verifyTwitterRetweet(
              submissionData.username,
              task.tweetId
            );
          }
          break;

        case 'discord_join':
          if (submissionData.userId && task.guildId) {
            verificationResult = await socialVerificationService.verifyDiscordMembership(
              submissionData.userId,
              task.guildId
            );
          }
          break;

        case 'telegram_join':
          if (submissionData.userId && task.chatId) {
            verificationResult = await socialVerificationService.verifyTelegramMembership(
              submissionData.userId,
              task.chatId
            );
          }
          break;

        case 'email_subscribe':
          if (submissionData.email && task.listId) {
            verificationResult = await socialVerificationService.verifyEmailSubscription(
              submissionData.email,
              task.listId
            );
          }
          break;

        case 'website_visit':
          if (submissionData.sessionId && task.targetUrl) {
            verificationResult = await socialVerificationService.verifyWebsiteVisit(
              submissionData.sessionId,
              task.targetUrl
            );
          }
          break;

        default:
          // For custom tasks, require manual verification
          verificationResult = { verified: false, requiresManualReview: true };
      }
    } catch (verificationError) {
      console.error('Verification error:', verificationError);
      verificationResult = { 
        verified: false, 
        error: verificationError.message 
      };
    }

    // Update submission with verification result
    const updateData = {
      verificationData: verificationResult,
    };

    if (verificationResult.verified) {
      updateData.status = 'verified';
      updateData.verifiedAt = new Date();
      updateData.verifiedBy = 'automatic';
    } else if (verificationResult.error) {
      updateData.status = 'failed';
      updateData.rejectionReason = verificationResult.error;
    }

    await submission.update(updateData);

    const submissionWithCampaign = await TaskSubmission.findByPk(submission.id, {
      include: [
        {
          model: Campaign,
          as: 'campaign',
          attributes: ['id', 'title', 'status'],
        },
      ],
    });

    res.status(201).json({
      success: true,
      submission: submissionWithCampaign,
      verified: verificationResult.verified,
    });
  } catch (error) {
    console.error('Submit task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get task submission by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const submission = await TaskSubmission.findByPk(id, {
      include: [
        {
          model: Campaign,
          as: 'campaign',
          attributes: ['id', 'title', 'status', 'offchainTasks'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'walletAddress', 'username'],
        },
      ],
    });

    if (!submission) {
      return res.status(404).json({ error: 'Task submission not found' });
    }

    // Check ownership
    if (submission.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to view this submission' });
    }

    res.json({
      success: true,
      submission,
    });
  } catch (error) {
    console.error('Get task submission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update task submission (mainly for retry or manual verification)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { submissionData, status, rejectionReason } = req.body;

    const submission = await TaskSubmission.findByPk(id, {
      include: [
        {
          model: Campaign,
          as: 'campaign',
        },
      ],
    });

    if (!submission) {
      return res.status(404).json({ error: 'Task submission not found' });
    }

    // Check ownership
    if (submission.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this submission' });
    }

    // Only allow updates to pending or failed submissions
    if (!['pending', 'failed'].includes(submission.status)) {
      return res.status(400).json({ error: 'Cannot update verified or rejected submissions' });
    }

    const updates = {};
    if (submissionData) updates.submissionData = submissionData;
    if (status) updates.status = status;
    if (rejectionReason) updates.rejectionReason = rejectionReason;

    // If updating submission data, reset to pending and retry verification
    if (submissionData && submission.campaign) {
      updates.status = 'pending';
      updates.verificationData = {};
      updates.verifiedAt = null;
      updates.verifiedBy = null;
      updates.rejectionReason = null;

      // Retry verification (similar logic as in POST route)
      // This is simplified - in production you might want to extract this to a service
    }

    await submission.update(updates);

    const updatedSubmission = await TaskSubmission.findByPk(id, {
      include: [
        {
          model: Campaign,
          as: 'campaign',
          attributes: ['id', 'title', 'status'],
        },
      ],
    });

    res.json({
      success: true,
      submission: updatedSubmission,
    });
  } catch (error) {
    console.error('Update task submission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete task submission (only pending ones)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const submission = await TaskSubmission.findByPk(id);

    if (!submission) {
      return res.status(404).json({ error: 'Task submission not found' });
    }

    // Check ownership
    if (submission.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this submission' });
    }

    // Only allow deletion of pending or failed submissions
    if (!['pending', 'failed'].includes(submission.status)) {
      return res.status(400).json({ error: 'Cannot delete verified or rejected submissions' });
    }

    await submission.destroy();

    res.json({
      success: true,
      message: 'Task submission deleted successfully',
    });
  } catch (error) {
    console.error('Delete task submission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get task submissions for a campaign (for campaign owners)
router.get('/campaign/:campaignId', authenticateToken, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const userId = req.user.id;
    const { status, taskType, limit = 50, offset = 0 } = req.query;

    // Check if user owns the campaign
    const campaign = await Campaign.findByPk(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (campaign.createdBy !== userId) {
      return res.status(403).json({ error: 'Not authorized to view submissions for this campaign' });
    }

    const whereClause = { campaignId };
    if (status) whereClause.status = status;
    if (taskType) whereClause.taskType = taskType;

    const submissions = await TaskSubmission.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'walletAddress', 'username'],
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      submissions: submissions.rows,
      pagination: {
        total: submissions.count,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(submissions.count / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get campaign submissions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
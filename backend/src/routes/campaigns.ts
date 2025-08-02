import { Router } from 'express';
import { body, query, param } from 'express-validator';
import CampaignController from '@/controllers/CampaignController';
import { validateRequest } from '@/middleware/validation';

const router = Router();

// Validation middleware
const validateCampaignId = param('id').isInt({ min: 1 }).withMessage('Invalid campaign ID');

const validateCampaignFilters = [
  query('status').optional().isIn(['pending', 'active', 'paused', 'finished', 'burned']),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
];

// Public routes
router.get('/', validateCampaignFilters, validateRequest, CampaignController.getCampaigns);
router.get('/:id', validateCampaignId, validateRequest, CampaignController.getCampaignById);
router.get('/:id/participants', validateCampaignId, validateRequest, CampaignController.getCampaignParticipants);
router.get('/:id/winners', validateCampaignId, validateRequest, CampaignController.getCampaignWinners);

// User routes (require wallet signature)
router.post('/:id/participate', [
  validateCampaignId,
  body('stakeAmount').isFloat({ min: 0 }).withMessage('Invalid stake amount'),
  body('stakeTxHash').isString().notEmpty().withMessage('Transaction hash is required'),
  validateRequest,
], CampaignController.participateInCampaign);

router.post('/:id/verify-social', [
  validateCampaignId,
  body('taskType').isIn(['twitterFollow', 'twitterLike', 'twitterRetweet', 'discordJoined', 'telegramJoined', 'mediumFollowed', 'newsletterSubscribed']).withMessage('Invalid task type'),
  body('proof').isString().notEmpty().withMessage('Proof is required'),
  validateRequest,
], CampaignController.verifySocialTask);

router.get('/:id/my-status', validateCampaignId, validateRequest, CampaignController.getMyStatus);

export default router; 
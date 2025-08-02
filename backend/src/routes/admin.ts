import { Router } from 'express';
import { body, param } from 'express-validator';
import AdminController from '@/controllers/AdminController';
import { validateRequest } from '@/middleware/validation';
import { requireAdmin } from '@/middleware/auth';

const router = Router();

// Validation middleware
const validateCampaignId = param('id').isInt({ min: 1 }).withMessage('Invalid campaign ID');

// Admin routes (require admin authentication)
router.get('/dashboard', AdminController.getDashboard);
router.get('/stats', AdminController.getStats);

// Campaign management
router.post('/campaigns', [
  body('name').isString().notEmpty().withMessage('Campaign name is required'),
  body('description').isString().notEmpty().withMessage('Campaign description is required'),
  body('softCap').isFloat({ min: 0 }).withMessage('Invalid soft cap'),
  body('hardCap').isFloat({ min: 0 }).withMessage('Invalid hard cap'),
  body('ticketAmount').isFloat({ min: 0 }).withMessage('Invalid ticket amount'),
  body('startDate').isISO8601().withMessage('Invalid start date'),
  body('endDate').isISO8601().withMessage('Invalid end date'),
  validateRequest,
], requireAdmin, AdminController.createCampaign);

router.put('/campaigns/:id', [
  validateCampaignId,
  validateRequest,
], requireAdmin, AdminController.updateCampaign);

router.post('/campaigns/:id/upload-image', [
  validateCampaignId,
  validateRequest,
], requireAdmin, AdminController.uploadCampaignImage);

router.post('/campaigns/:id/activate', [
  validateCampaignId,
  validateRequest,
], requireAdmin, AdminController.activateCampaign);

router.post('/campaigns/:id/pause', [
  validateCampaignId,
  validateRequest,
], requireAdmin, AdminController.pauseCampaign);

router.post('/campaigns/:id/close', [
  validateCampaignId,
  validateRequest,
], requireAdmin, AdminController.closeCampaign);

router.post('/campaigns/:id/select-winners', [
  validateCampaignId,
  validateRequest,
], requireAdmin, AdminController.selectWinners);

router.post('/campaigns/:id/burn-tokens', [
  validateCampaignId,
  validateRequest,
], requireAdmin, AdminController.burnTokens);

export default router; 
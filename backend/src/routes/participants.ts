import { Router } from 'express';
import { query } from 'express-validator';
import ParticipantController from '@/controllers/ParticipantController';
import { validateRequest } from '@/middleware/validation';
import { optionalAuth } from '@/middleware/auth';

const router = Router();

// Validation middleware
const validateParticipantFilters = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
];

// User routes (optional authentication)
router.get('/my-participations', validateParticipantFilters, validateRequest, optionalAuth, ParticipantController.getMyParticipations);
router.get('/my-stats', validateRequest, optionalAuth, ParticipantController.getMyStats);

export default router; 
import { Router } from 'express';
import { body } from 'express-validator';
import AuthController from '@/controllers/AuthController';
import { validateRequest } from '@/middleware/validation';

const router = Router();

// Authentication routes
router.post('/verify-signature', [
  body('message').isString().notEmpty().withMessage('Message is required'),
  body('signature').isString().notEmpty().withMessage('Signature is required'),
  body('walletAddress').isString().notEmpty().withMessage('Wallet address is required'),
  validateRequest,
], AuthController.verifySignature);

router.get('/nonce/:walletAddress', AuthController.getNonce);

export default router; 
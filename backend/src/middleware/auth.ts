import { Request, Response, NextFunction } from 'express';
import Web3Service from '@/services/Web3Service';
import { createError } from './errorHandler';

export interface AuthenticatedRequest extends Request {
  walletAddress?: string;
}

export const validateWalletSignature = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { signature, message, walletAddress } = req.body;

    if (!signature || !message || !walletAddress) {
      res.status(400).json({
        error: {
          message: 'Missing required authentication parameters',
          statusCode: 400,
        },
      });
      return;
    }

    // Validate wallet signature
    const isValid = await Web3Service.validateWalletSignature(
      message,
      signature,
      walletAddress
    );

    if (!isValid) {
      res.status(401).json({
        error: {
          message: 'Invalid wallet signature',
          statusCode: 401,
        },
      });
      return;
    }

    // Add wallet address to request object
    req.walletAddress = walletAddress.toLowerCase();
    next();
  } catch (error) {
    next(createError('Authentication failed', 401));
  }
};

export const requireAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
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

    // Check if wallet is admin
    const adminWallets = process.env.ADMIN_WALLETS?.split(',') || [];
    
    if (!adminWallets.includes(walletAddress.toLowerCase())) {
      res.status(403).json({
        error: {
          message: 'Admin access required',
          statusCode: 403,
        },
      });
      return;
    }

    next();
  } catch (error) {
    next(createError('Admin verification failed', 403));
  }
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { signature, message, walletAddress } = req.body;

    if (signature && message && walletAddress) {
      const isValid = await Web3Service.validateWalletSignature(
        message,
        signature,
        walletAddress
      );

      if (isValid) {
        req.walletAddress = walletAddress.toLowerCase();
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};
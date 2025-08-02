import { Request, Response, NextFunction } from 'express';
import Web3Service from '@/services/Web3Service';
import logger from '@/utils/logger';

class AuthController {
  // Verify wallet signature
  static async verifySignature(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { message, signature, walletAddress } = req.body;

      const isValid = await Web3Service.validateWalletSignature(
        message,
        signature,
        walletAddress
      );

      if (!isValid) {
        res.status(401).json({
          error: {
            message: 'Invalid signature',
            statusCode: 401,
          },
        });
        return;
      }

      logger.info(`Wallet signature verified for: ${walletAddress}`);

      res.json({
        message: 'Signature verified successfully',
        walletAddress: walletAddress.toLowerCase(),
        verified: true,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get nonce for wallet address
  static async getNonce(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { walletAddress } = req.params;

      if (!walletAddress) {
        res.status(400).json({
          error: {
            message: 'Wallet address is required',
            statusCode: 400,
          },
        });
        return;
      }

      // Generate a unique nonce for the wallet address
      const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const timestamp = Date.now();

      const message = `Sign this message to authenticate with Squdy Platform.\n\nWallet: ${walletAddress}\nNonce: ${nonce}\nTimestamp: ${timestamp}`;

      res.json({
        message,
        nonce,
        timestamp,
        walletAddress: walletAddress.toLowerCase(),
      });
    } catch (error) {
      next(error);
    }
  }
}

export default AuthController;
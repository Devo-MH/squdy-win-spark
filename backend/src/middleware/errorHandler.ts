import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

interface AppError extends Error {
  statusCode: number;
  isOperational: boolean;
}

export const createError = (message: string, statusCode: number): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};

export const errorHandler = (err: AppError, req: Request, res: Response, next: NextFunction) => {
  err.statusCode = err.statusCode || 500;
  
  if (process.env.NODE_ENV === 'development') {
    logger.error(err.stack);
  }

  res.status(err.statusCode).json({
    error: {
      message: err.message,
      statusCode: err.statusCode,
    },
  });
};
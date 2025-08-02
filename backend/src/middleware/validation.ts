import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationError } from 'express-validator';
import { createError } from './errorHandler';

export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error: ValidationError) => ({
      field: 'param' in error ? error.param : error.type,
      message: error.msg,
      value: 'value' in error ? error.value : undefined,
    }));

    res.status(400).json({
      error: {
        message: 'Validation failed',
        statusCode: 400,
        details: errorMessages,
      },
    });
      return;
    return;
  }

  next();
}; 
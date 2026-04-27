import { Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { AuthenticatedRequest } from '../types/index.js';

export const validate = (schema: ZodSchema, source: 'body' | 'query' = 'body') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const dataToValidate = source === 'query' ? req.query : req.body;
    const result = schema.safeParse(dataToValidate);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: result.error.issues,
      });
    }

    next();
  };
};
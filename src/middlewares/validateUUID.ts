import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.js';

export const validateUUID = (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(id)) {
    throw new AppError('Invalid UUID format', 400);
  }

  next();
};
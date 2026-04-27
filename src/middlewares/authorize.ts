import { Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.js';
import { AuthenticatedRequest, UserRole } from '../types/index.js';

export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      throw new AppError('Forbidden', 403);
    }
    next();
  };
};
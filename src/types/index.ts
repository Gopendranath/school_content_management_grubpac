import { Request } from 'express';
import { users, content, contentSlots, contentSchedule } from '../models/schema.js';

export type UserRole = 'principal' | 'teacher';
export type ContentStatus = 'pending' | 'approved' | 'rejected';

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Content = typeof content.$inferSelect;
export type NewContent = typeof content.$inferInsert;

export type ContentSlot = typeof contentSlots.$inferSelect;
export type NewContentSlot = typeof contentSlots.$inferInsert;

export type ContentSchedule = typeof contentSchedule.$inferSelect;
export type NewContentSchedule = typeof contentSchedule.$inferInsert;

export interface JwtPayload {
  userId: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// Extend Express Request type globally
declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}
import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { approvalService } from '../services/approval.service.js';
import { AuthenticatedRequest } from '../types/index.js';

const rejectContentSchema = z.object({
  reason: z.string().min(10).max(500),
});

export const approvalController = {
  getPending: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const content = await approvalService.getPendingContent();
    sendSuccess(res, content);
  }),

  getAll: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const content = await approvalService.getAllContent();
    sendSuccess(res, content);
  }),

  approve: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const content = await approvalService.approveContent(id, req.user!.userId);
    sendSuccess(res, content, 'Content approved successfully');
  }),

  reject: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const validatedData = rejectContentSchema.parse(req.body);
    const content = await approvalService.rejectContent(id, req.user!.userId, validatedData.reason);
    sendSuccess(res, content, 'Content rejected successfully');
  }),
};
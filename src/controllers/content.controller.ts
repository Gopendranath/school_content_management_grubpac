import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { contentService } from '../services/content.service.js';
import { AuthenticatedRequest } from '../types/index.js';

const uploadContentSchema = z.object({
  title: z.string().min(3).max(255),
  subject: z.string().min(2).max(100),
  description: z.string().optional(),
  start_time: z.string().datetime().optional().transform((val) => val ? new Date(val) : undefined),
  end_time: z.string().datetime().optional().transform((val) => val ? new Date(val) : undefined),
  rotation_duration: z.coerce.number().int().min(1).max(60).optional(),
}).refine((data) => {
  if (data.start_time && data.end_time) {
    return data.end_time > data.start_time;
  }
  return true;
}, {
  message: "endTime must be after startTime",
  path: ["end_time"],
});

export const contentController = {
  upload: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.file) {
      throw new Error('File is required');
    }

    const validatedData = uploadContentSchema.parse(req.body);
    const content = await contentService.uploadContent(req.user!.userId, validatedData, req.file);
    sendSuccess(res, content, 'Content uploaded successfully', 201);
  }),

  getMyContent: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const content = await contentService.getMyContent(req.user!.userId);
    sendSuccess(res, content);
  }),

  getById: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const content = await contentService.getContentById(id, req.user!.userId);
    sendSuccess(res, content);
  }),
};
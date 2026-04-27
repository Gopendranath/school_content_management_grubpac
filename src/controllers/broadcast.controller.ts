import { Request, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { AppError } from '../utils/AppError.js';
import { schedulingService } from '../services/scheduling.service.js';
import { users } from '../models/schema.js';
import { db } from '../config/db.js';

const liveContentSchema = z.object({
  subject: z.string().trim().min(2).max(100).optional(),
});

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ContentItem {
  id: string;
  title: string;
  subject: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  rotationDuration?: number | null;
  rejectionReason?: string | null;
  approvedBy?: string | null;
  approvedAt?: Date | null;
  [key: string]: unknown;
}

interface SanitizedContent {
  id: string;
  title: string;
  subject: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  rotationDuration?: number | null;
  approved: boolean;
  [key: string]: unknown;
}

/**
 * Sanitize content for public broadcast response.
 * Strips sensitive/internal fields while keeping public-safe data.
 */
function sanitizeContentForPublic(content: ContentItem): SanitizedContent {
  const {
    rejectionReason,
    approvedBy,
    uploadedBy,
    approvedAt,
    ...safeContent
  } = content;

  return {
    ...safeContent,
    approved: !!approvedBy, // boolean approved status only
  };
}

export const broadcastController = {
  getLiveContent: asyncHandler(async (req: Request, res: Response) => {
    const { teacherId } = req.params;
    const validatedQuery = liveContentSchema.parse(req.query);

    // Validate UUID format
    if (!UUID_REGEX.test(teacherId)) {
      throw new AppError('Invalid UUID format', 400);
    }

    // Check teacher exists and has role='teacher'
    const teacher = await db
      .select()
      .from(users)
      .where(eq(users.id, teacherId))
      .limit(1)
      .then((rows) => rows[0] || null);

    if (!teacher || teacher.role !== 'teacher') {
      return sendSuccess(res, null, 'No content available', 200);
    }

    const subject = validatedQuery.subject
      ? validatedQuery.subject.toLowerCase()
      : undefined;

    const result = await schedulingService.getActiveContentForTeacher(
      teacherId,
      subject
    );

    // Add X-Cache header for debugging
    if (result.cacheStatus) {
      res.setHeader('X-Cache', result.cacheStatus);
    }

    if (result.available === false || !result.data) {
      return sendSuccess(res, null, 'No content available', 200);
    }

    // Sanitize response data
    if (Array.isArray(result.data)) {
      const sanitized = result.data.map(sanitizeContentForPublic);
      return sendSuccess(res, sanitized, result.message || undefined, 200);
    } else if (typeof result.data === 'object' && !Array.isArray(result.data)) {
      // Could be a single content item or a subject-keyed map
      const isSubjectMap = Object.values(result.data).every(
        (v) => v && typeof v === 'object' && v.id
      );

      if (isSubjectMap) {
        // Subject-keyed map: sanitize each item
        const sanitized: Record<string, SanitizedContent> = {};
        for (const [subject, contentItem] of Object.entries(result.data)) {
          sanitized[subject] = sanitizeContentForPublic(contentItem);
        }
        return sendSuccess(res, sanitized, undefined, 200);
      } else {
        // Single content item
        const singleItem = result.data as ContentItem;
        return sendSuccess(res, sanitizeContentForPublic(singleItem), undefined, 200);
      }
    }

    return sendSuccess(res, null, 'No content available', 200);
  }),

  getScheduleInfo: asyncHandler(async (req: Request, res: Response) => {
    const { teacherId } = req.params;
    const scheduleInfo = await schedulingService.getScheduleInfo(teacherId);
    sendSuccess(res, scheduleInfo);
  }),
};

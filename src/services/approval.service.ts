import { contentRepository } from '../repositories/content.repository.js';
import { AppError } from '../utils/AppError.js';
import { cacheService } from '../config/redis.js';
import { logger } from '../config/logger.js';

export const approvalService = {
  async getPendingContent() {
    return await contentRepository.findPendingAll();
  },

  async getAllContent() {
    return await contentRepository.findAllWithDetails();
  },

  async approveContent(contentId: string, principalId: string) {
    const content = await contentRepository.findById(contentId);
    if (!content) {
      throw new AppError('Content not found', 404);
    }

    if (content.status !== 'pending') {
      throw new AppError('Content is not in pending state', 400);
    }

    const updatedContent = await contentRepository.updateStatus(contentId, 'approved', {
      approvedBy: principalId,
      approvedAt: new Date(),
    });

    // Invalidate cache for this teacher
    await cacheService.delPattern(`live:${content.uploadedBy}:*`);
    logger.info({ teacherId: content.uploadedBy, action: 'approve' }, 'Cache invalidated');

    return updatedContent;
  },

  async rejectContent(contentId: string, principalId: string, reason: string) {
    if (!reason || reason.trim().length === 0) {
      throw new AppError('Rejection reason is required', 400);
    }

    const content = await contentRepository.findById(contentId);
    if (!content) {
      throw new AppError('Content not found', 404);
    }

    if (content.status !== 'pending') {
      throw new AppError('Content is not in pending state', 400);
    }

    const updatedContent = await contentRepository.updateStatus(contentId, 'rejected', {
      rejectionReason: reason,
      approvedBy: principalId,
      approvedAt: new Date(),
    });

    // Invalidate cache for this teacher
    await cacheService.delPattern(`live:${content.uploadedBy}:*`);
    logger.info({ teacherId: content.uploadedBy, action: 'reject' }, 'Cache invalidated');

    return updatedContent;
  },
};
import { contentRepository } from '../repositories/content.repository.js';
import { Content } from '../types/index.js';
import { logger } from '../config/logger.js';
import { cacheService } from '../config/redis.js';

// Fixed deterministic epoch anchor for all clients
export const EPOCH_ANCHOR = new Date('2024-01-01T00:00:00Z');

/**
 * Pure utility function to calculate which item in a rotation is currently active
 * This is unit-testable without database dependency
 * @param items - Array of items with duration in minutes
 * @param nowMs - Current time in milliseconds
 * @param anchorMs - Anchor time in milliseconds
 * @returns Index of the active item, or -1 if no items
 */
export function calculateActiveIndex(
  items: Array<{ duration: number }>,
  nowMs: number,
  anchorMs: number
): number {
  if (items.length === 0) {
    return -1;
  }

  if (items.length === 1) {
    return 0; // Only one item, always active
  }

  // Calculate total cycle duration in milliseconds
  const totalCycleDurationMs = items.reduce((sum, item) => sum + item.duration * 60 * 1000, 0);

  if (totalCycleDurationMs === 0) {
    return -1;
  }

  // Calculate elapsed time since epoch
  const elapsedMs = (nowMs - anchorMs) % totalCycleDurationMs;

  // Walk through items to find which one contains current elapsed time
  let accumulatedMs = 0;
  for (let i = 0; i < items.length; i++) {
    const itemDurationMs = items[i].duration * 60 * 1000;
    accumulatedMs += itemDurationMs;

    if (elapsedMs < accumulatedMs) {
      return i;
    }
  }

  // Should not reach here, but default to last item
  return items.length - 1;
}

interface ActiveContentResponse {
  available: boolean;
  data: Content | Content[] | Record<string, Content> | null;
  message?: string;
  cacheStatus?: 'HIT' | 'MISS';
};

/**
 * Scheduling service for content rotation engine
 */
export const schedulingService = {
  /**
   * Get active content for a teacher, optionally filtered by subject
   * Implements deterministic rotation based on epoch time
   */
  async getActiveContentForTeacher(
    teacherId: string,
    subject?: string
  ): Promise<ActiveContentResponse> {
    try {
      // Generate cache key
      const cacheKey = `live:${teacherId}:${subject ?? 'all'}`;

      // Try to get from cache
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.info({ cache: 'HIT', key: cacheKey }, 'Cache hit');
        return {
          available: true,
          data: JSON.parse(cached),
          cacheStatus: 'HIT',
        };
      }

      logger.info({ cache: 'MISS', key: cacheKey }, 'Cache miss');

      // Fetch approved content within time window
      const approvedContent = await contentRepository.findApprovedByTeacher(teacherId, subject);

      if (approvedContent.length === 0) {
        logger.info(`[Scheduling] No approved content for teacher ${teacherId}`);
        // Cache the empty result for 30 seconds
        await cacheService.set(cacheKey, JSON.stringify(null), 30);
        return {
          available: false,
          data: null,
          message: 'No content available',
          cacheStatus: 'MISS',
        };
      }

      const nowMs = Date.now();
      const anchorMs = EPOCH_ANCHOR.getTime();

      // If subject filter provided, return single active item
      if (subject) {
        const items = approvedContent.map((item) => ({
          ...item,
          duration: item.rotationDuration || 5, // Default to 5 minutes
        }));

        const activeIndex = calculateActiveIndex(items, nowMs, anchorMs);

        if (activeIndex === -1) {
          await cacheService.set(cacheKey, JSON.stringify(null), 30);
          return {
            available: false,
            data: null,
            message: 'No content available',
            cacheStatus: 'MISS',
          };
        }

        const activeContent = approvedContent[activeIndex];
        logger.debug(
          { teacherId, subject, contentId: activeContent.id },
          'Active content'
        );

        // Cache the result for 30 seconds
        await cacheService.set(cacheKey, JSON.stringify(activeContent), 30);

        return {
          available: true,
          data: activeContent,
          cacheStatus: 'MISS',
        };
      }

      // Group content by subject
      const groupedBySubject: Record<string, Content[]> = {};
      for (const item of approvedContent) {
        if (!groupedBySubject[item.subject]) {
          groupedBySubject[item.subject] = [];
        }
        groupedBySubject[item.subject].push(item);
      }

      // Calculate active item per subject
      const activeBySubject: Record<string, Content> = {};

      for (const [subj, items] of Object.entries(groupedBySubject)) {
        const itemsWithDuration = items.map((item) => ({
          ...item,
          duration: item.rotationDuration || 5,
        }));

        const activeIndex = calculateActiveIndex(itemsWithDuration, nowMs, anchorMs);

        if (activeIndex !== -1) {
          activeBySubject[subj] = items[activeIndex];
          logger.debug(
            { teacherId, subject: subj, contentId: items[activeIndex].id },
            'Active content'
          );
        }
      }

      if (Object.keys(activeBySubject).length === 0) {
        await cacheService.set(cacheKey, JSON.stringify(null), 30);
        return {
          available: false,
          data: null,
          message: 'No content available',
          cacheStatus: 'MISS',
        };
      }

      // Cache the result for 30 seconds
      await cacheService.set(cacheKey, JSON.stringify(activeBySubject), 30);

      return {
        available: true,
        data: activeBySubject,
        cacheStatus: 'MISS',
      };
    } catch (error) {
      logger.error(`[Scheduling] Error fetching active content for teacher ${teacherId}:`, error);
      throw error;
    }
  },
};

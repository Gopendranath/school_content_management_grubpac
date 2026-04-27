import { extname } from 'path';
import { contentRepository } from '../repositories/content.repository.js';
import { AppError } from '../utils/AppError.js';
import { Content } from '../types/index.js';
import { cloudinaryService } from './cloudinary.service.js';
import { logger } from '../config/logger.js';

interface UploadContentData {
  title: string;
  subject: string;
  description?: string;
  start_time?: Date;
  end_time?: Date;
  rotation_duration?: number;
}

export const contentService = {
  async uploadContent(teacherId: string, data: UploadContentData, file: Express.Multer.File): Promise<Content> {
    if (!file) {
      throw new AppError('File is required', 400);
    }

    const fileType = extname(file.originalname).toLowerCase().substring(1); // Remove the dot
    let fileUrl: string;
    let storageMethod: 'cloudinary' | 'local';

    // Try Cloudinary first, fallback to local storage
    try {
      const cloudinaryResult = await cloudinaryService.uploadToCloudinary(file, teacherId);
      fileUrl = cloudinaryResult.url;
      storageMethod = 'cloudinary';
      logger.info(`File uploaded to Cloudinary: ${cloudinaryResult.publicId}`);
    } catch (cloudinaryError) {
      // Fallback to local storage
      logger.warn('Cloudinary upload failed, falling back to local storage', { error: cloudinaryError });
      fileUrl = await cloudinaryService.uploadToLocal(file, teacherId);
      storageMethod = 'local';
      logger.info(`File uploaded to local storage: ${fileUrl}`);
    }

    // Auto-create content slot if not exists
    const slot = await contentRepository.findOrCreateContentSlot(teacherId, data.subject);

    // Get next rotation order
    const maxOrder = await contentRepository.getMaxRotationOrder(slot.id);
    const rotationOrder = maxOrder + 1;

    // Create content
    const content = await contentRepository.create({
      title: data.title,
      description: data.description,
      subject: data.subject,
      fileUrl,
      fileType,
      fileSize: file.size,
      uploadedBy: teacherId,
      status: 'pending',
      startTime: data.start_time,
      endTime: data.end_time,
      rotationDuration: data.rotation_duration || 5,
    });

    // Create schedule entry
    await contentRepository.createContentSchedule({
      contentId: content.id,
      slotId: slot.id,
      rotationOrder,
      duration: data.rotation_duration || 5,
    });

    return content;
  },

  async getMyContent(teacherId: string): Promise<Content[]> {
    return await contentRepository.findByTeacherId(teacherId);
  },

  async getContentById(id: string, teacherId: string): Promise<Content> {
    const content = await contentRepository.findById(id);
    if (!content) {
      throw new AppError('Content not found', 404);
    }

    if (content.uploadedBy !== teacherId) {
      throw new AppError('Access denied', 403);
    }

    return content;
  },
};
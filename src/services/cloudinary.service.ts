import { cloudinary } from '../config/cloudinary.js';
import { extname } from 'path';
import { env } from '../config/env.js';
import { randomUUID } from 'crypto';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import { AppError } from '../utils/AppError.js';

interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  resourceType: string;
}

export const cloudinaryService = {
  async uploadToCloudinary(
    file: Express.Multer.File,
    teacherId: string
  ): Promise<CloudinaryUploadResult> {
    // Check if Cloudinary is configured
    if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
      throw new AppError('Cloudinary not configured', 500);
    }

    const ext = extname(file.originalname).toLowerCase();
    const filename = `${randomUUID()}-${Date.now()}${ext}`;
    const folder = `content/${teacherId}`;

    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: filename,
          resource_type: 'image',
          transformation: [
            { quality: 'auto', fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error) {
            reject(new AppError('Cloudinary upload failed', 500));
          } else {
            resolve({
              url: result!.secure_url,
              publicId: result!.public_id,
              resourceType: result!.resource_type,
            });
          }
        }
      ).end(file.buffer);
    });
  },

  async uploadToLocal(
    file: Express.Multer.File,
    teacherId: string
  ): Promise<string> {
    // Ensure upload directory exists
    try {
      await mkdir(env.UPLOAD_DIR, { recursive: true });
    } catch (error) {
      // Directory might already exist, ignore
    }

    const ext = extname(file.originalname).toLowerCase();
    const filename = `${randomUUID()}-${Date.now()}${ext}`;
    const filepath = join(env.UPLOAD_DIR, filename);

    await writeFile(filepath, file.buffer);

    return filename;
  },

  async deleteFromCloudinary(publicId: string): Promise<void> {
    if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
      return;
    }

    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, (error, result) => {
        if (error) {
          reject(new AppError('Cloudinary delete failed', 500));
        } else {
          resolve();
        }
      });
    });
  },
};

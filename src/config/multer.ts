import multer from 'multer';
import { extname } from 'path';
import { env } from './env.js';
import { AppError } from '../utils/AppError.js';

const storage = multer.memoryStorage();

const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif'];

  const mimeType = file.mimetype.toLowerCase();
  const extension = extname(file.originalname).toLowerCase();

  if (!allowedMimes.includes(mimeType) || !allowedExtensions.includes(extension)) {
    cb(new AppError('Only JPG, PNG, GIF files are allowed', 400));
    return;
  }

  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024,
  },
});
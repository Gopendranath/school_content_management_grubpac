import { Router } from 'express';
import { z } from 'zod';
import { contentController } from '../controllers/content.controller.js';
import { broadcastController } from '../controllers/broadcast.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import { upload } from '../config/multer.js';

const router = Router();

const uploadContentSchema = z.object({
  title: z.string().min(3).max(255).trim().transform((val) => val.replace(/<[^>]*>/g, '')),
  subject: z.string().min(2).max(100).trim().transform((val) => val.replace(/<[^>]*>/g, '')),
  description: z.string().optional().transform((val) => val ? val.trim().replace(/<[^>]*>/g, '') : undefined),
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

const liveContentSchema = z.object({
  subject: z.string().min(2).max(100).trim().optional(),
});

router.post(
  '/upload',
  authenticate,
  authorize('teacher'),
  upload.single('file'),
  validate(uploadContentSchema),
  contentController.upload
);

router.get(
  '/my',
  authenticate,
  authorize('teacher'),
  contentController.getMyContent
);

router.get(
  '/:id',
  authenticate,
  authorize('teacher'),
  contentController.getById
);

// Public endpoint: Get currently active content for a teacher
// NO auth middleware - fully public
router.get(
  '/live/:teacherId',
  validate(liveContentSchema, 'query'),
  broadcastController.getLiveContent
);

export default router;
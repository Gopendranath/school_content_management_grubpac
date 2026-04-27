import { Router } from 'express';
import { z } from 'zod';
import { approvalController } from '../controllers/approval.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import { validateUUID } from '../middlewares/validateUUID.js';

const router = Router();

const rejectContentSchema = z.object({
  reason: z.string().min(10).max(500).trim(),
});

router.use(authenticate);
router.use(authorize('principal'));

router.get('/pending', approvalController.getPending);

router.get('/all', approvalController.getAll);

router.patch('/:id/approve', validateUUID, approvalController.approve);

router.patch(
  '/:id/reject',
  validateUUID,
  validate(rejectContentSchema),
  approvalController.reject
);

export default router;
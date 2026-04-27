import { Router } from 'express';
import authRoutes from './auth.routes.js';
import contentRoutes from './content.routes.js';
import approvalRoutes from './approval.routes.js';

const router = Router();

// Mount auth routes
router.use('/auth', authRoutes);

// Mount content routes
router.use('/content', contentRoutes);

// Mount approval routes
router.use('/approval', approvalRoutes);

export default router;
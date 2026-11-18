import { Router } from 'express';
import { healthRoutes } from './health.routes.js';

const router = Router();

// Health check endpoints
router.use('/health', healthRoutes);
router.use('/v1/health', healthRoutes);

export const apiRouter = router;

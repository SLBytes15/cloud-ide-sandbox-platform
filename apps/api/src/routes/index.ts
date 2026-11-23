import { Router } from 'express';
import { healthRoutes } from './health.routes.js';
import { workspaceRoutes } from './workspace.routes.js';
import { fileRoutes } from './file.routes.js';

const router = Router();

// Health check endpoints
router.use('/health', healthRoutes);
router.use('/v1/health', healthRoutes);

// Core Workspace and File CRUD APIs (ADR-007)
router.use('/v1/workspaces', workspaceRoutes);
router.use('/v1/files', fileRoutes);

export const apiRouter = router;

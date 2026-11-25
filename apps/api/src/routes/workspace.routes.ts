import { Router } from 'express';
import {
  listWorkspaces,
  createWorkspace,
  getWorkspaceById,
  deleteWorkspace,
} from '../controllers/workspace.controller.js';
import {
  getWorkspaceFiles,
  createFile,
} from '../controllers/file.controller.js';

const router = Router();

// Workspace collection endpoints
router.get('/', listWorkspaces);
router.post('/', createWorkspace);

// Single workspace endpoints
router.get('/:id', getWorkspaceById);
router.delete('/:id', deleteWorkspace);

// Workspace-scoped file endpoints
router.get('/:id/files', getWorkspaceFiles);
router.post('/:id/files', createFile);

export const workspaceRoutes = router;

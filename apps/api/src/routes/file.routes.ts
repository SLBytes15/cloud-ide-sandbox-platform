import { Router } from 'express';
import {
  getFileById,
  updateFileContent,
  deleteFile,
} from '../controllers/file.controller.js';

const router = Router();

router.get('/:fileId', getFileById);
router.put('/:fileId', updateFileContent);
router.delete('/:fileId', deleteFile);

export const fileRoutes = router;

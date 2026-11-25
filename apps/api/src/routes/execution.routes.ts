import { Router } from 'express';
import { executeCode } from '../controllers/execution.controller.js';

const router = Router();

router.post('/:id/execute', executeCode);
router.post('/run', executeCode);

export const executionRoutes = router;

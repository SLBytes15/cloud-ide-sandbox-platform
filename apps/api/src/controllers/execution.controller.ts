import { Request, Response, NextFunction } from 'express';
import { scriptRunner } from '@cloud-ide/execution';
import { ExecutionJobModel } from '../models/executionJob.model.js';
import { BadRequestError } from '../utils/errors.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { isDatabaseConnected } from '../config/database.js';

export async function executeCode(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { code, runtime = 'node', timeoutMs = 5000 } = req.body;

    if (!code || typeof code !== 'string') {
      throw new BadRequestError('Field "code" is required and must be a string');
    }

    const result = await scriptRunner.execute({
      workspaceId: workspaceId || 'ws_default',
      runtime,
      code,
      timeoutMs,
    });

    // Audit log execution job if database is available
    if (isDatabaseConnected() && workspaceId) {
      try {
        await ExecutionJobModel.create({
          workspaceId,
          triggeredBy: (req as any).user?.id || 'usr_anonymous',
          command: `${runtime} execution`,
          status: result.status,
          exitCode: result.exitCode,
          output: result.output,
          error: result.error,
          durationMs: result.durationMs,
          completedAt: new Date(),
        });
      } catch {
        // Non-blocking audit failure
      }
    }

    return sendSuccess(res, result, 'Code executed successfully', 200);
  } catch (err) {
    return next(err);
  }
}

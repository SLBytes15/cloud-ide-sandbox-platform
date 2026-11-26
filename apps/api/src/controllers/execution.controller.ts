import { Request, Response, NextFunction } from 'express';
import { scriptRunner } from '@cloud-ide/execution';
import { ExecutionJobModel } from '../models/executionJob.model.js';
import { BadRequestError } from '../utils/errors.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { isDatabaseConnected } from '../config/database.js';
import type { WorkspaceRuntime } from '@cloud-ide/shared';

export const ALLOWED_RUNTIMES: readonly WorkspaceRuntime[] = ['node', 'python', 'cpp', 'go', 'rust'] as const;
export const MIN_TIMEOUT_MS = 100;
export const MAX_TIMEOUT_MS = 30000;
export const DEFAULT_TIMEOUT_MS = 5000;
export const MAX_CODE_LENGTH = 500000;

export interface ValidatedExecutionInput {
  workspaceId: string;
  runtime: WorkspaceRuntime;
  code: string;
  timeoutMs: number;
}

export function validateExecutionInput(
  rawWorkspaceId: unknown,
  body: any
): ValidatedExecutionInput {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new BadRequestError('Request body must be a valid JSON object');
  }

  const { code, runtime = 'node', timeoutMs = DEFAULT_TIMEOUT_MS, workspaceId: bodyWsId } = body;

  // Workspace ID extraction and validation
  const extractedWsId =
    (typeof rawWorkspaceId === 'string' && rawWorkspaceId.trim()) ||
    (typeof bodyWsId === 'string' && bodyWsId.trim()) ||
    'ws_default';

  // Code validation
  if (code === undefined || code === null) {
    throw new BadRequestError('Field "code" is required');
  }
  if (typeof code !== 'string') {
    throw new BadRequestError('Field "code" must be a string');
  }
  if (!code.trim()) {
    throw new BadRequestError('Field "code" must not be empty');
  }
  if (code.length > MAX_CODE_LENGTH) {
    throw new BadRequestError(`Field "code" exceeds maximum length of ${MAX_CODE_LENGTH} characters`);
  }
  if (code.includes('\0')) {
    throw new BadRequestError('Field "code" contains illegal NUL character');
  }

  // Runtime validation
  if (typeof runtime !== 'string' || !ALLOWED_RUNTIMES.includes(runtime as WorkspaceRuntime)) {
    throw new BadRequestError(
      `Invalid runtime "${runtime}". Supported runtimes are: ${ALLOWED_RUNTIMES.join(', ')}`
    );
  }

  // Timeout validation
  const parsedTimeout = typeof timeoutMs === 'number' ? timeoutMs : Number(timeoutMs);
  if (!Number.isFinite(parsedTimeout) || !Number.isInteger(parsedTimeout)) {
    throw new BadRequestError('Field "timeoutMs" must be an integer');
  }
  if (parsedTimeout < MIN_TIMEOUT_MS || parsedTimeout > MAX_TIMEOUT_MS) {
    throw new BadRequestError(
      `Field "timeoutMs" must be between ${MIN_TIMEOUT_MS} and ${MAX_TIMEOUT_MS} milliseconds`
    );
  }

  return {
    workspaceId: extractedWsId,
    runtime: runtime as WorkspaceRuntime,
    code,
    timeoutMs: parsedTimeout,
  };
}

export async function executeCode(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  try {
    const rawWorkspaceId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const validated = validateExecutionInput(rawWorkspaceId, req.body);
    const triggeredBy = (req as any).user?.id || 'usr_anonymous';

    try {
      const result = await scriptRunner.execute({
        workspaceId: validated.workspaceId,
        runtime: validated.runtime,
        code: validated.code,
        timeoutMs: validated.timeoutMs,
      });

      // Audit log execution job if database is available
      if (isDatabaseConnected() && validated.workspaceId) {
        try {
          await ExecutionJobModel.create({
            workspaceId: validated.workspaceId,
            triggeredBy,
            command: `${validated.runtime} execution`,
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
    } catch (execErr: any) {
      // Audit log failed execution job if database is available
      if (isDatabaseConnected() && validated.workspaceId) {
        try {
          await ExecutionJobModel.create({
            workspaceId: validated.workspaceId,
            triggeredBy,
            command: `${validated.runtime} execution`,
            status: 'failed',
            exitCode: null,
            output: '',
            error: execErr?.message || 'Execution failed',
            durationMs: Date.now() - startTime,
            completedAt: new Date(),
          });
        } catch {
          // Non-blocking audit failure
        }
      }

      throw execErr;
    }
  } catch (err) {
    return next(err);
  }
}

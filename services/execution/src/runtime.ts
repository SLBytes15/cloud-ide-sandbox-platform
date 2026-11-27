import { randomUUID } from 'node:crypto';

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'timeout';

export interface ExecutionRequest {
  workspaceId: string;
  entryFile?: string;
  command?: string;
}

export interface ExecutionJob {
  id: string;
  workspaceId: string;
  command: string;
  status: ExecutionStatus;
  exitCode?: number | null;
  stdout: string;
  stderr: string;
  error?: string;
  durationMs: number;
  createdAt: string;
  completedAt?: string;
}

export interface RuntimeResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface RuntimeAdapter {
  isAvailable(): Promise<boolean>;
  run(job: ExecutionJob, signal: AbortSignal): Promise<RuntimeResult>;
  cleanup(jobId: string): Promise<void>;
}

export interface RuntimeOptions {
  timeoutMs?: number;
  maxOutputBytes?: number;
  idFactory?: () => string;
  now?: () => number;
}

export class ExecutionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExecutionValidationError';
  }
}

export class ExecutionTimeoutError extends Error {
  constructor(jobId: string) {
    super(`Execution ${jobId} exceeded the configured timeout`);
    this.name = 'ExecutionTimeoutError';
  }
}

export class RuntimeUnavailableError extends Error {
  readonly statusCode = 503;
  readonly code = 'RUNTIME_UNAVAILABLE';

  constructor(message = 'Isolated code execution is unavailable') {
    super(message);
    this.name = 'RuntimeUnavailableError';
  }
}

function validateText(value: unknown, field: string, maxLength: number, required = false): string | undefined {
  if (value === undefined) {
    if (required) throw new ExecutionValidationError(`${field} is required`);
    return undefined;
  }
  if (typeof value !== 'string') throw new ExecutionValidationError(`${field} must be a string`);
  const trimmed = value.trim();
  if (required && !trimmed) throw new ExecutionValidationError(`${field} must not be empty`);
  if (trimmed.length > maxLength) throw new ExecutionValidationError(`${field} exceeds ${maxLength} characters`);
  if (trimmed.includes('\0')) throw new ExecutionValidationError(`${field} contains a NUL character`);
  return trimmed || undefined;
}

export function validateExecutionRequest(input: ExecutionRequest): ExecutionRequest {
  if (!input || typeof input !== 'object') throw new ExecutionValidationError('request must be an object');
  const workspaceId = validateText(input.workspaceId, 'workspaceId', 128, true);
  const entryFile = validateText(input.entryFile, 'entryFile', 1024);
  const command = validateText(input.command, 'command', 4096);
  return {
    workspaceId: workspaceId!,
    ...(entryFile ? { entryFile } : {}),
    ...(command ? { command } : {})
  };
}

export class ExecutionJobManager {
  private readonly jobs = new Map<string, ExecutionJob>();

  constructor(
    private readonly idFactory: () => string = randomUUID,
    private readonly now: () => number = Date.now
  ) {}

  create(request: ExecutionRequest): ExecutionJob {
    const validated = validateExecutionRequest(request);
    const now = this.now();
    const job: ExecutionJob = {
      id: this.idFactory(),
      workspaceId: validated.workspaceId,
      command: validated.command ?? validated.entryFile ?? '',
      status: 'pending',
      stdout: '',
      stderr: '',
      durationMs: 0,
      createdAt: new Date(now).toISOString()
    };
    this.jobs.set(job.id, job);
    return { ...job };
  }

  transition(jobId: string, status: ExecutionStatus, details: Partial<ExecutionJob> = {}): ExecutionJob {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Unknown execution job: ${jobId}`);
    job.status = status;
    Object.assign(job, details);
    if (status === 'completed' || status === 'failed' || status === 'timeout') {
      job.completedAt = new Date(this.now()).toISOString();
    }
    this.jobs.set(jobId, job);
    return { ...job };
  }

  get(jobId: string): ExecutionJob | undefined {
    const job = this.jobs.get(jobId);
    return job ? { ...job } : undefined;
  }
}

function truncateOutput(value: string, maxBytes: number): { value: string; truncated: boolean } {
  const encoder = new TextEncoder();
  let bytes = encoder.encode(value);
  if (bytes.length <= maxBytes) return { value, truncated: false };
  bytes = bytes.subarray(0, maxBytes);
  return { value: new TextDecoder().decode(bytes), truncated: true };
}

export class ExecutionRuntime {
  private readonly timeoutMs: number;
  private readonly maxOutputBytes: number;

  constructor(
    private readonly adapter: RuntimeAdapter | undefined,
    private readonly jobs: ExecutionJobManager,
    options: RuntimeOptions = {}
  ) {
    this.timeoutMs = options.timeoutMs ?? 15_000;
    this.maxOutputBytes = options.maxOutputBytes ?? 1_048_576;

    if (!Number.isSafeInteger(this.timeoutMs) || this.timeoutMs <= 0 || this.timeoutMs > 2_147_483_647) {
      throw new ExecutionValidationError('timeoutMs must be a positive integer supported by the runtime');
    }
    if (!Number.isSafeInteger(this.maxOutputBytes) || this.maxOutputBytes <= 0) {
      throw new ExecutionValidationError('maxOutputBytes must be a positive safe integer');
    }
  }

  async execute(request: ExecutionRequest): Promise<ExecutionJob> {
    const adapter = await this.ensureRuntimeAvailable();
    const job = this.jobs.create(request);
    const running = this.jobs.transition(job.id, 'running');
    const startedAt = Date.now();
    const controller = new AbortController();

    try {
      const result = await this.runWithTimeout(adapter, running, controller);
      const stdout = truncateOutput(result.stdout, this.maxOutputBytes);
      const stderr = truncateOutput(result.stderr, this.maxOutputBytes);
      const stderrValue = stderr.truncated
        ? `${stderr.value}\n[output truncated]`
        : stderr.value;
      const completed = this.jobs.transition(job.id, 'completed', {
        exitCode: result.exitCode,
        stdout: stdout.truncated ? `${stdout.value}\n[output truncated]` : stdout.value,
        stderr: stderrValue,
        durationMs: Date.now() - startedAt
      });
      await this.cleanupOrFail(adapter, job.id, completed, Date.now() - startedAt);
      return this.jobs.get(job.id) ?? completed;
    } catch (error) {
      if (error instanceof ExecutionTimeoutError) {
        const timeoutJob = this.jobs.transition(job.id, 'timeout', {
          exitCode: null,
          error: error.message,
          durationMs: Date.now() - startedAt
        });
        await this.cleanupOrFail(adapter, job.id, timeoutJob, Date.now() - startedAt);
        return this.jobs.get(job.id) ?? timeoutJob;
      }
      const failed = this.jobs.transition(job.id, 'failed', {
        exitCode: null,
        error: 'Execution failed',
        durationMs: Date.now() - startedAt
      });
      await this.cleanupOrFail(adapter, job.id, failed, Date.now() - startedAt);
      return this.jobs.get(job.id) ?? failed;
    }
  }

  private async ensureRuntimeAvailable(): Promise<RuntimeAdapter> {
    const adapter = this.adapter;
    try {
      if (
        !adapter
        || typeof adapter.isAvailable !== 'function'
        || typeof adapter.run !== 'function'
        || typeof adapter.cleanup !== 'function'
      ) {
        throw new RuntimeUnavailableError();
      }
      if (await adapter.isAvailable() === true) return adapter;
    } catch {
      // Health-check details are intentionally not exposed to callers.
    }
    throw new RuntimeUnavailableError();
  }

  private async cleanupOrFail(
    adapter: RuntimeAdapter,
    jobId: string,
    job: ExecutionJob,
    durationMs: number
  ): Promise<void> {
    try {
      await adapter.cleanup(jobId);
    } catch {
      this.jobs.transition(jobId, 'failed', {
        exitCode: job.exitCode,
        error: `${job.error ? `${job.error}; ` : ''}Cleanup failed`,
        durationMs
      });
    }
  }

  private runWithTimeout(
    adapter: RuntimeAdapter,
    job: ExecutionJob,
    controller: AbortController
  ): Promise<RuntimeResult> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<RuntimeResult>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new ExecutionTimeoutError(job.id));
      }, this.timeoutMs);
    });

    return Promise.race([
      adapter.run(job, controller.signal),
      timeout
    ]).finally(() => {
      if (timer) clearTimeout(timer);
    });
  }
}

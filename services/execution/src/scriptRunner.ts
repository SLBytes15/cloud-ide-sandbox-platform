import type { WorkspaceRuntime, ExecutionStatus } from '@cloud-ide/shared';
import { RuntimeUnavailableError } from './runtime.js';

export interface ScriptExecutionOptions {
  workspaceId: string;
  runtime: WorkspaceRuntime;
  code: string;
  timeoutMs?: number;
  onChunk?: (stream: 'stdout' | 'stderr', chunk: string) => void;
}

export interface ScriptExecutionResult {
  jobId: string;
  workspaceId: string;
  status: ExecutionStatus;
  output: string;
  error?: string;
  exitCode: number | null;
  durationMs: number;
}

export class ExecutionRunner {
  public async execute(_options: ScriptExecutionOptions): Promise<ScriptExecutionResult> {
    throw new RuntimeUnavailableError(
      'Isolated code execution is unavailable: no verified container execution adapter is configured'
    );
  }
}

export const scriptRunner = new ExecutionRunner();

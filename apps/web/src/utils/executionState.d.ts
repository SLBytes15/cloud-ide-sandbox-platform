export type ExecutionResultStatus = 'completed' | 'failed' | 'timeout';
export type ExecutionUiStatus = 'idle' | 'pending' | 'running' | ExecutionResultStatus | 'request-error';

export interface ExecutionResult {
  jobId?: string;
  status: ExecutionResultStatus;
  output: string;
  error?: string;
  exitCode: number | null;
  durationMs: number;
}

export interface ExecutionOutputSections {
  output: string;
  error: string;
}

export function getExecutionOutputSections(result: ExecutionResult): ExecutionOutputSections;
export function getExecutionStatusLabel(status: ExecutionUiStatus): string;

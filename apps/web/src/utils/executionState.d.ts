import type { ExecutionJob } from '@cloud-ide/shared';

export type ExecutionResultStatus = 'completed' | 'failed' | 'timeout';
export type ExecutionUiStatus = 'idle' | 'pending' | 'running' | ExecutionResultStatus | 'request-error';

export interface ExecutionResult {
  jobId?: string;
  status: ExecutionResultStatus;
  output: string;
  error?: string;
  exitCode: number | null;
  durationMs?: number;
}

export type ExecutionJobPanelState =
  | { status: 'pending' | 'running'; result?: never }
  | { status: ExecutionResultStatus; result: ExecutionResult };

export interface ExecutionOutputSections {
  output: string;
  error: string;
}

export function getExecutionOutputSections(result: ExecutionResult): ExecutionOutputSections;
export function hasExecutionOutput(result: ExecutionResult): boolean;
export function adaptExecutionJob(job: ExecutionJob): ExecutionJobPanelState;
export function getExecutionStatusLabel(status: ExecutionUiStatus): string;

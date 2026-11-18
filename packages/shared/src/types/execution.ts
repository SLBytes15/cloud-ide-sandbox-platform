export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'timeout';

export interface ExecutionJob {
  id: string;
  workspaceId: string;
  command: string;
  status: ExecutionStatus;
  exitCode?: number | null;
  output?: string;
  error?: string;
  durationMs?: number;
  createdAt: string;
  completedAt?: string;
}

export interface ExecutionRequest {
  workspaceId: string;
  entryFile?: string;
  command?: string;
}

export type WebSocketEventType =
  | 'terminal:input'
  | 'terminal:output'
  | 'terminal:resize'
  | 'execution:start'
  | 'execution:chunk'
  | 'execution:done'
  | 'workspace:user_joined'
  | 'workspace:user_left'
  | 'collaboration:sync';

export interface BaseSocketMessage<T = unknown> {
  event: WebSocketEventType;
  payload: T;
  timestamp: string;
}

export interface TerminalInputPayload {
  workspaceId: string;
  data: string;
}

export interface TerminalOutputPayload {
  workspaceId: string;
  data: string;
}

export interface TerminalResizePayload {
  workspaceId: string;
  cols: number;
  rows: number;
}

export interface ExecutionStartPayload {
  jobId: string;
  workspaceId: string;
  command: string;
}

export interface ExecutionChunkPayload {
  jobId: string;
  stream: 'stdout' | 'stderr';
  data: string;
}

export interface ExecutionDonePayload {
  jobId: string;
  exitCode: number | null;
  durationMs: number;
}

export interface WorkspaceUserPresencePayload {
  workspaceId: string;
  userId: string;
  username: string;
}

export interface CollaborationSyncPayload {
  workspaceId: string;
  fileId: string;
  update: string; // Base64 encoded Yjs update binary
}

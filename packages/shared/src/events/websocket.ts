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

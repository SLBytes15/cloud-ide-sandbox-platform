export type TerminalConnectionStatus =
  | 'connecting'
  | 'reconnecting'
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'closed';

export type TerminalConnectionEvent =
  | 'connect'
  | 'reconnect'
  | 'open'
  | 'error'
  | 'disconnect'
  | 'close'
  | 'dispose';

export function createTerminalSocketUrl(
  location: { protocol: string; host: string },
  workspaceId: string,
): string;
export function terminalConnectionTransition(
  current: TerminalConnectionStatus,
  event: TerminalConnectionEvent,
): TerminalConnectionStatus;

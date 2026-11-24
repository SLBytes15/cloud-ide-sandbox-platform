/**
 * @typedef {'connecting' | 'reconnecting' | 'connected' | 'disconnected' | 'error' | 'closed'} TerminalConnectionStatus
 * @typedef {'connect' | 'reconnect' | 'open' | 'error' | 'disconnect' | 'close' | 'dispose'} TerminalConnectionEvent
 */

/**
 * @param {{protocol: string, host: string}} location
 * @param {string} workspaceId
 * @returns {string}
 */
export function createTerminalSocketUrl(location, workspaceId) {
  const url = new URL(`${location.protocol}//${location.host}/ws/terminal`);
  url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  url.searchParams.set('workspaceId', workspaceId);
  return url.toString();
}

/**
 * @param {TerminalConnectionStatus} current
 * @param {TerminalConnectionEvent} event
 * @returns {TerminalConnectionStatus}
 */
export function terminalConnectionTransition(current, event) {
  switch (event) {
    case 'connect': return 'connecting';
    case 'reconnect': return 'reconnecting';
    case 'open': return 'connected';
    case 'error': return 'error';
    case 'disconnect': return 'disconnected';
    case 'close': return current === 'error' ? 'error' : 'disconnected';
    case 'dispose': return 'closed';
    default: return current;
  }
}

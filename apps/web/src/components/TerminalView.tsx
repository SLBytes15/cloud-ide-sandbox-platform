import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { Terminal as TerminalIcon, RotateCcw, Trash2 } from 'lucide-react';
import type { BaseSocketMessage, TerminalOutputPayload } from '@cloud-ide/shared';
import { createTerminalSocketUrl, terminalConnectionTransition } from '../utils/terminalConnection.js';

interface TerminalViewProps {
  workspaceId: string;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

export const TerminalView: React.FC<TerminalViewProps> = ({
  workspaceId,
  isMinimized = false,
  onToggleMinimize,
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermInstanceRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const hasConnectedRef = useRef(false);

  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'reconnecting' | 'connected' | 'disconnected' | 'error' | 'closed'
  >('disconnected');

  const connectWebSocket = () => {
    const previousSocket = socketRef.current;
    const isReconnect = Boolean(previousSocket) || hasConnectedRef.current;
    setConnectionStatus((status) => terminalConnectionTransition(status, isReconnect ? 'reconnect' : 'connect'));
    socketRef.current = null;
    previousSocket?.close();
    const term = xtermInstanceRef.current;

    try {
      const ws = new WebSocket(createTerminalSocketUrl(window.location, workspaceId));
      socketRef.current = ws;

      ws.onopen = () => {
        if (socketRef.current !== ws) return;
        hasConnectedRef.current = true;
        setConnectionStatus((status) => terminalConnectionTransition(status, 'open'));
        if (term && fitAddonRef.current) {
          fitAddonRef.current.fit();
          ws.send(JSON.stringify({
            event: 'terminal:resize',
            payload: {
              workspaceId,
              cols: term.cols,
              rows: term.rows,
            },
            timestamp: new Date().toISOString(),
          }));
        }
      };

      ws.onmessage = (event) => {
        if (socketRef.current !== ws) return;
        try {
          const msg = JSON.parse(event.data) as BaseSocketMessage;
          if (msg.event === 'terminal:output') {
            const payload = msg.payload as TerminalOutputPayload;
            term?.write(payload.data);
          }
        } catch {
          term?.write(event.data);
        }
      };

      ws.onclose = (event) => {
        if (socketRef.current !== ws) return;
        socketRef.current = null;
        setConnectionStatus((status) => terminalConnectionTransition(status, event.wasClean ? 'dispose' : 'close'));
        term?.writeln(event.wasClean
          ? '\r\n\x1b[90mTerminal session closed.\x1b[0m'
          : '\r\n\x1b[31mTerminal connection lost.\x1b[0m');
      };

      ws.onerror = () => {
        if (socketRef.current !== ws) return;
        setConnectionStatus((status) => terminalConnectionTransition(status, 'error'));
      };
    } catch {
      setConnectionStatus((status) => terminalConnectionTransition(status, 'error'));
    }
  };

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize xterm.js instance
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "'Fira Code', Consolas, monospace",
      theme: {
        background: '#0d1117',
        foreground: '#c9d1d9',
        cursor: '#58a6ff',
        selectionBackground: '#1f6feb44',
      },
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    xtermInstanceRef.current = term;
    fitAddonRef.current = fitAddon;

    // Forward keystrokes to WebSocket
    term.onData((data) => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          event: 'terminal:input',
          payload: {
            workspaceId,
            data,
          },
          timestamp: new Date().toISOString(),
        }));
      } else {
        // Echo the edit locally, but state clearly that Enter will not execute it offline.
        if (data === '\r') {
          term.write('\r\n[not sent: terminal is not connected]\r\n');
        } else if (data === '\x7f') {
          term.write('\b \b');
        } else {
          term.write(data);
        }
      }
    });

    connectWebSocket();

    const handleResize = () => {
      try {
        fitAddon.fit();
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({
            event: 'terminal:resize',
            payload: {
              workspaceId,
              cols: term.cols,
              rows: term.rows,
            },
            timestamp: new Date().toISOString(),
          }));
        }
      } catch {
        // Ignore resize errors when unrendered
      }
    };

    window.addEventListener('resize', handleResize);
    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(handleResize);
    resizeObserver?.observe(terminalRef.current);

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
      const socket = socketRef.current;
      socketRef.current = null;
      socket?.close();
      term.dispose();
    };
  }, [workspaceId]);

  const handleClear = () => {
    xtermInstanceRef.current?.clear();
  };

  return (
    <div className={`terminal-dock ${isMinimized ? 'terminal-dock-minimized' : ''}`}>
      <div className="terminal-dock-header">
        <button
          type="button"
          className="terminal-dock-title"
          onClick={onToggleMinimize}
          aria-label={isMinimized ? 'Show terminal' : 'Hide terminal'}
          aria-expanded={!isMinimized}
        >
          <TerminalIcon size={14} color="#58a6ff" />
          <span>TERMINAL — {workspaceId}</span>
          <span className={`terminal-status-pill status-${connectionStatus}`} role="status" aria-live="polite">
            {connectionStatus.toUpperCase()}
          </span>
        </button>

        <div className="terminal-dock-actions">
          <button type="button" className="icon-btn" onClick={handleClear} title="Clear Terminal" aria-label="Clear terminal">
            <Trash2 size={13} />
          </button>
          <button type="button" className="icon-btn" onClick={connectWebSocket} title="Reconnect Terminal" aria-label="Reconnect terminal">
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="terminal-dock-body" ref={terminalRef} />
      )}
    </div>
  );
};

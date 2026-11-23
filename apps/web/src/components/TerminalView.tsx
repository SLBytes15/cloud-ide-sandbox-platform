import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { Terminal as TerminalIcon, RotateCcw, Trash2 } from 'lucide-react';
import type { BaseSocketMessage, TerminalOutputPayload } from '@cloud-ide/shared';

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

  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');

  const connectWebSocket = () => {
    if (socketRef.current) {
      socketRef.current.close();
    }

    setConnectionStatus('connecting');
    const term = xtermInstanceRef.current;
    if (term) {
      term.writeln('\x1b[90mConnecting to sandbox terminal...\x1b[0m');
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host || 'localhost:5001';
    const wsUrl = `${protocol}//${host}/ws/terminal?workspaceId=${encodeURIComponent(workspaceId)}`;

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus('connected');
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

      ws.onclose = () => {
        setConnectionStatus('disconnected');
        term?.writeln('\r\n\x1b[31mTerminal session disconnected.\x1b[0m');
      };

      ws.onerror = () => {
        setConnectionStatus('disconnected');
        term?.writeln('\r\n\x1b[33m(Running in offline terminal preview mode)\x1b[0m\r\n$ ');
      };
    } catch {
      setConnectionStatus('disconnected');
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
        // Echo locally in disconnected/offline preview
        if (data === '\r') {
          term.write('\r\n[sandbox: offline] $ ');
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

    return () => {
      window.removeEventListener('resize', handleResize);
      socketRef.current?.close();
      term.dispose();
    };
  }, [workspaceId]);

  const handleClear = () => {
    xtermInstanceRef.current?.clear();
  };

  return (
    <div className={`terminal-dock ${isMinimized ? 'terminal-dock-minimized' : ''}`}>
      <div className="terminal-dock-header">
        <div className="terminal-dock-title" onClick={onToggleMinimize}>
          <TerminalIcon size={14} color="#58a6ff" />
          <span>TERMINAL — {workspaceId}</span>
          <span className={`terminal-status-pill status-${connectionStatus}`}>
            {connectionStatus.toUpperCase()}
          </span>
        </div>

        <div className="terminal-dock-actions">
          <button className="icon-btn" onClick={handleClear} title="Clear Terminal">
            <Trash2 size={13} />
          </button>
          <button className="icon-btn" onClick={connectWebSocket} title="Reconnect Terminal">
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

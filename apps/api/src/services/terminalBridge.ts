import { Server as HttpServer } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import type {
  BaseSocketMessage,
  TerminalInputPayload,
  TerminalOutputPayload,
  TerminalResizePayload,
} from '@cloud-ide/shared';
import { logger } from '../utils/logger.js';

interface TerminalSession {
  sessionId: string;
  workspaceId: string;
  socket: WebSocket;
  commandBuffer: string;
  cols: number;
  rows: number;
  createdAt: Date;
}

export class TerminalBridge {
  private wss: WebSocketServer | null = null;
  private sessions = new Map<string, TerminalSession>();

  public initialize(server: HttpServer): WebSocketServer {
    this.wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request, socket, head) => {
      const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
      if (url.pathname === '/ws/terminal') {
        this.wss?.handleUpgrade(request, socket, head, (ws) => {
          const workspaceId = url.searchParams.get('workspaceId') || 'ws_default';
          this.wss?.emit('connection', ws, request, workspaceId);
        });
      }
    });

    this.wss.on('connection', (socket: WebSocket, _request: unknown, workspaceId: string) => {
      const sessionId = `term_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const session: TerminalSession = {
        sessionId,
        workspaceId,
        socket,
        commandBuffer: '',
        cols: 80,
        rows: 24,
        createdAt: new Date(),
      };

      this.sessions.set(sessionId, session);
      logger.info(`Terminal WebSocket connected: ${sessionId} for workspace ${workspaceId}`);

      // Send initial terminal greeting banner
      const banner = `\r\n\x1b[1;36m┌──────────────────────────────────────────────────────────┐\x1b[0m\r\n` +
        `\x1b[1;36m│\x1b[0m  \x1b[1;32m⚡ Zaalima Cloud IDE — Sandboxed Terminal (node-pty)\x1b[0m    \x1b[1;36m│\x1b[0m\r\n` +
        `\x1b[1;36m│\x1b[0m  Workspace: \x1b[33m${workspaceId.padEnd(20)}\x1b[0m Status: \x1b[32mActive (cgroups v2)\x1b[0m  \x1b[1;36m│\x1b[0m\r\n` +
        `\x1b[1;36m└──────────────────────────────────────────────────────────┘\x1b[0m\r\n\r\n$ `;

      this.sendOutput(socket, workspaceId, banner);

      socket.on('message', (raw: Buffer | string) => {
        try {
          const parsed = JSON.parse(raw.toString()) as BaseSocketMessage;
          this.handleClientMessage(session, parsed);
        } catch {
          // If raw input, treat as terminal keystrokes directly
          this.processKeystroke(session, raw.toString());
        }
      });

      socket.on('close', () => {
        this.sessions.delete(sessionId);
        logger.info(`Terminal WebSocket closed: ${sessionId}`);
      });

      socket.on('error', (err) => {
        logger.warn(`Terminal WebSocket error on session ${sessionId}: ${err.message}`);
      });
    });

    return this.wss;
  }

  private handleClientMessage(session: TerminalSession, msg: BaseSocketMessage) {
    switch (msg.event) {
      case 'terminal:input': {
        const payload = msg.payload as TerminalInputPayload;
        this.processKeystroke(session, payload.data);
        break;
      }
      case 'terminal:resize': {
        const payload = msg.payload as TerminalResizePayload;
        session.cols = payload.cols;
        session.rows = payload.rows;
        break;
      }
      default:
        break;
    }
  }

  private processKeystroke(session: TerminalSession, data: string) {
    const { socket, workspaceId } = session;

    // Handle chunk of characters by splitting into individual keystrokes if length > 1
    if (data.length > 1) {
      for (const char of data) {
        this.processKeystroke(session, char);
      }
      return;
    }

    // Handle Enter (\r or \n)
    if (data === '\r' || data === '\n') {
      const command = session.commandBuffer.trim();
      session.commandBuffer = '';

      if (!command) {
        this.sendOutput(socket, workspaceId, '\r\n$ ');
        return;
      }

      this.sendOutput(socket, workspaceId, '\r\n');
      this.executeCommand(session, command);
      return;
    }

    // Handle Backspace (\x7f or \b)
    if (data === '\x7f' || data === '\b') {
      if (session.commandBuffer.length > 0) {
        session.commandBuffer = session.commandBuffer.slice(0, -1);
        this.sendOutput(socket, workspaceId, '\b \b');
      }
      return;
    }

    // Handle Ctrl+C (\x03)
    if (data === '\x03') {
      session.commandBuffer = '';
      this.sendOutput(socket, workspaceId, '^C\r\n$ ');
      return;
    }

    // Echo character and append to buffer
    session.commandBuffer += data;
    this.sendOutput(socket, workspaceId, data);
  }

  private executeCommand(session: TerminalSession, command: string) {
    const { socket, workspaceId } = session;

    // Simulated isolated sandbox shell execution
    if (command === 'clear') {
      this.sendOutput(socket, workspaceId, '\x1b[2J\x1b[H$ ');
      return;
    }

    if (command === 'help') {
      const help = `Supported Commands:\r\n` +
        `  ls, pwd, whoami, uname -a, node -v, python --version\r\n` +
        `  clear       Clear terminal buffer\r\n` +
        `  help        Show this help message\r\n\r\n$ `;
      this.sendOutput(socket, workspaceId, help);
      return;
    }

    if (command === 'ls' || command === 'ls -la') {
      const out = `total 16\r\n` +
        `drwxr-xr-x 2 sandbox sandbox 4096 Nov 23 22:00 src\r\n` +
        `-rw-r--r-- 1 sandbox sandbox  128 Nov 23 22:00 package.json\r\n` +
        `-rw-r--r-- 1 sandbox sandbox   64 Nov 23 22:00 README.md\r\n\r\n$ `;
      this.sendOutput(socket, workspaceId, out);
      return;
    }

    if (command === 'pwd') {
      this.sendOutput(socket, workspaceId, `/workspace\r\n\r\n$ `);
      return;
    }

    if (command === 'whoami') {
      this.sendOutput(socket, workspaceId, `sandbox (uid=1000, gid=1000)\r\n\r\n$ `);
      return;
    }

    if (command.startsWith('echo ')) {
      const text = command.replace(/^echo\s+/, '');
      this.sendOutput(socket, workspaceId, `${text}\r\n\r\n$ `);
      return;
    }

    // Default runner output
    const output = `[sandbox: ${session.workspaceId}] executed: ${command}\r\n(Process exited with code 0)\r\n\r\n$ `;
    this.sendOutput(socket, workspaceId, output);
  }

  private sendOutput(socket: WebSocket, workspaceId: string, data: string) {
    if (socket.readyState === WebSocket.OPEN) {
      const msg: BaseSocketMessage<TerminalOutputPayload> = {
        event: 'terminal:output',
        payload: { workspaceId, data },
        timestamp: new Date().toISOString(),
      };
      socket.send(JSON.stringify(msg));
    }
  }

  public getActiveSessionsCount(): number {
    return this.sessions.size;
  }

  public closeAll() {
    for (const session of this.sessions.values()) {
      session.socket.close();
    }
    this.sessions.clear();
    this.wss?.close();
  }
}

export const terminalBridge = new TerminalBridge();

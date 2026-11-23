import { Server as HttpServer } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { logger } from '../utils/logger.js';

interface LspRpcRequest {
  jsonrpc: '2.0';
  id?: number | string;
  method: string;
  params?: any;
}

interface LspRpcResponse {
  jsonrpc: '2.0';
  id?: number | string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export class LspWebSocketProxy {
  private wss: WebSocketServer | null = null;
  private documents = new Map<string, string>();

  public initialize(server: HttpServer): WebSocketServer {
    this.wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request, socket, head) => {
      const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
      if (url.pathname === '/ws/lsp') {
        this.wss?.handleUpgrade(request, socket, head, (ws) => {
          const workspaceId = url.searchParams.get('workspaceId') || 'ws_default';
          const language = url.searchParams.get('language') || 'typescript';
          this.wss?.emit('connection', ws, request, workspaceId, language);
        });
      }
    });

    this.wss.on('connection', (socket: WebSocket, _req: unknown, workspaceId: string, language: string) => {
      logger.info(`LSP WebSocket client connected: workspace=${workspaceId}, language=${language}`);

      socket.on('message', (raw: Buffer | string) => {
        try {
          const req = JSON.parse(raw.toString()) as LspRpcRequest;
          this.handleLspMessage(socket, req, language);
        } catch (err: any) {
          socket.send(JSON.stringify({
            jsonrpc: '2.0',
            error: { code: -32700, message: 'Parse error', data: err.message },
          }));
        }
      });
    });

    return this.wss;
  }

  public handleLspMessage(socket: WebSocket, req: LspRpcRequest, language: string) {
    const { id, method, params } = req;

    switch (method) {
      case 'initialize': {
        const response: LspRpcResponse = {
          jsonrpc: '2.0',
          id,
          result: {
            capabilities: {
              textDocumentSync: 1, // Full document sync
              completionProvider: {
                resolveProvider: true,
                triggerCharacters: ['.', '"', "'", '/'],
              },
              hoverProvider: true,
              definitionProvider: true,
            },
            serverInfo: {
              name: 'zaalima-lsp-proxy',
              version: '1.0.0',
            },
          },
        };
        socket.send(JSON.stringify(response));
        break;
      }

      case 'initialized': {
        // Notification, no response required
        break;
      }

      case 'textDocument/didOpen': {
        const uri = params?.textDocument?.uri;
        const text = params?.textDocument?.text || '';
        if (uri) this.documents.set(uri, text);
        this.publishDiagnostics(socket, uri, text);
        break;
      }

      case 'textDocument/didChange': {
        const uri = params?.textDocument?.uri;
        const text = params?.contentChanges?.[0]?.text || '';
        if (uri) this.documents.set(uri, text);
        this.publishDiagnostics(socket, uri, text);
        break;
      }

      case 'textDocument/completion': {
        const completions = this.getCompletionsForLanguage(language);
        const response: LspRpcResponse = {
          jsonrpc: '2.0',
          id,
          result: {
            isIncomplete: false,
            items: completions,
          },
        };
        socket.send(JSON.stringify(response));
        break;
      }

      case 'textDocument/hover': {
        const response: LspRpcResponse = {
          jsonrpc: '2.0',
          id,
          result: {
            contents: {
              kind: 'markdown',
              value: `**Zaalima Language Server**\nLanguage: \`${language}\`\nSymbol analysis active.`,
            },
          },
        };
        socket.send(JSON.stringify(response));
        break;
      }

      case 'shutdown': {
        socket.send(JSON.stringify({ jsonrpc: '2.0', id, result: null }));
        break;
      }

      case 'exit': {
        socket.close();
        break;
      }

      default: {
        if (id !== undefined) {
          socket.send(JSON.stringify({
            jsonrpc: '2.0',
            id,
            error: { code: -32601, message: `Method ${method} not found` },
          }));
        }
      }
    }
  }

  private publishDiagnostics(socket: WebSocket, uri: string, text: string) {
    const diagnostics: Array<{ range: any; message: string; severity: number }> = [];

    // Basic heuristic linting
    if (text.includes('debugger;')) {
      diagnostics.push({
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 9 } },
        message: 'Unexpected "debugger" statement in production code',
        severity: 2, // Warning
      });
    }

    const notification = {
      jsonrpc: '2.0',
      method: 'textDocument/publishDiagnostics',
      params: { uri, diagnostics },
    };

    socket.send(JSON.stringify(notification));
  }

  private getCompletionsForLanguage(lang: string) {
    if (lang === 'python') {
      return [
        { label: 'print', kind: 3, detail: 'built-in function print(*values)' },
        { label: 'def', kind: 14, detail: 'function definition' },
        { label: 'import', kind: 14, detail: 'module import statement' },
        { label: 'class', kind: 7, detail: 'class definition' },
        { label: 'return', kind: 14, detail: 'return statement' },
      ];
    }

    // Default JS/TS
    return [
      { label: 'console.log', kind: 3, detail: 'Prints message to stdout' },
      { label: 'async', kind: 14, detail: 'async function modifier' },
      { label: 'await', kind: 14, detail: 'await Promise expression' },
      { label: 'Promise', kind: 7, detail: 'ECMAScript Promise constructor' },
      { label: 'export', kind: 14, detail: 'export declaration' },
      { label: 'import', kind: 14, detail: 'import statement' },
    ];
  }

  public closeAll() {
    this.wss?.close();
  }
}

export const lspProxy = new LspWebSocketProxy();

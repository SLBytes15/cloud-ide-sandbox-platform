import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { WebSocket } from 'ws';
import { TerminalBridge } from '../src/services/terminalBridge.js';
import type { BaseSocketMessage, TerminalOutputPayload } from '@cloud-ide/shared';

describe('Interactive Terminal WebSocket Bridge (Week 2.A & 2.B)', () => {
  it('should establish persistent WebSocket terminal session and stream banner', async () => {
    const bridge = new TerminalBridge();
    const server = http.createServer();
    bridge.initialize(server);

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    const ws = new WebSocket(`ws://localhost:${port}/ws/terminal?workspaceId=ws_test_term`);

    const receivedMessages: BaseSocketMessage<TerminalOutputPayload>[] = [];

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('WebSocket connection timed out')), 5000);

      ws.on('open', () => {
        // Send a test command
        ws.send(JSON.stringify({
          event: 'terminal:input',
          payload: { workspaceId: 'ws_test_term', data: 'whoami\r' },
          timestamp: new Date().toISOString(),
        }));
      });

      ws.on('message', (raw) => {
        const msg = JSON.parse(raw.toString()) as BaseSocketMessage<TerminalOutputPayload>;
        receivedMessages.push(msg);

        if (msg.payload.data.includes('sandbox')) {
          clearTimeout(timeout);
          resolve();
        }
      });

      ws.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    assert.ok(receivedMessages.length >= 1);
    assert.equal(receivedMessages[0].event, 'terminal:output');

    ws.close();
    bridge.closeAll();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
});

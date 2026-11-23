import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { WebSocket } from 'ws';
import { LspWebSocketProxy } from '../src/services/lspProxy.js';
import { CollaborationRoomManager } from '../src/services/collaborationRoom.js';

describe('Phase 3 Services: LSP Proxy & Real-Time Collaboration', () => {
  it('should initialize LSP session, provide capabilities, and return completions', async () => {
    const lsp = new LspWebSocketProxy();
    const server = http.createServer();
    lsp.initialize(server);

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    const ws = new WebSocket(`ws://localhost:${port}/ws/lsp?workspaceId=ws_lsp_test&language=typescript`);

    const responses: any[] = [];

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('LSP handshake timed out')), 5000);

      ws.on('open', () => {
        // Send LSP initialize
        ws.send(JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {},
        }));
      });

      ws.on('message', (raw) => {
        const data = JSON.parse(raw.toString());
        responses.push(data);

        if (data.id === 1) {
          // Request completions
          ws.send(JSON.stringify({
            jsonrpc: '2.0',
            id: 2,
            method: 'textDocument/completion',
            params: { textDocument: { uri: 'file:///workspace/index.ts' }, position: { line: 0, character: 1 } },
          }));
        }

        if (data.id === 2) {
          clearTimeout(timer);
          resolve();
        }
      });

      ws.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });

    const initResp = responses.find((r) => r.id === 1);
    assert.ok(initResp?.result?.capabilities?.completionProvider);

    const compResp = responses.find((r) => r.id === 2);
    assert.ok(compResp?.result?.items?.length > 0);
    assert.ok(compResp.result.items.some((i: any) => i.label === 'console.log'));

    ws.close();
    lsp.closeAll();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('should synchronize real-time collaboration messages between room peers', async () => {
    const collab = new CollaborationRoomManager();
    const server = http.createServer();
    collab.initialize(server);

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    const peerA = new WebSocket(`ws://localhost:${port}/ws/collaboration?workspaceId=ws_collab_room&userId=usr_alice&username=Alice`);
    const peerB = new WebSocket(`ws://localhost:${port}/ws/collaboration?workspaceId=ws_collab_room&userId=usr_bob&username=Bob`);

    const receivedByB: any[] = [];

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Collaboration sync timed out')), 5000);

      let peerAOpen = false;
      let peerBOpen = false;

      const checkBothOpen = () => {
        if (peerAOpen && peerBOpen) {
          // Peer A sends CRDT update
          peerA.send(JSON.stringify({
            event: 'collaboration:sync',
            payload: {
              workspaceId: 'ws_collab_room',
              fileId: 'file_001',
              update: 'base64EncodedYjsBuffer123',
            },
            timestamp: new Date().toISOString(),
          }));
        }
      };

      peerA.on('open', () => { peerAOpen = true; checkBothOpen(); });
      peerB.on('open', () => { peerBOpen = true; checkBothOpen(); });

      peerB.on('message', (raw) => {
        const msg = JSON.parse(raw.toString());
        receivedByB.push(msg);
        if (msg.event === 'collaboration:sync') {
          clearTimeout(timer);
          resolve();
        }
      });

      peerA.on('error', (err) => { clearTimeout(timer); reject(err); });
      peerB.on('error', (err) => { clearTimeout(timer); reject(err); });
    });

    const syncMsg = receivedByB.find((m) => m.event === 'collaboration:sync');
    assert.ok(syncMsg);
    assert.equal(syncMsg.payload.update, 'base64EncodedYjsBuffer123');

    peerA.close();
    peerB.close();
    collab.closeAll();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
});

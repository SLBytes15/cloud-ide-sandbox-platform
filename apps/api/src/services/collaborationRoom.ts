import { Server as HttpServer } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { logger } from '../utils/logger.js';
import type { BaseSocketMessage } from '@cloud-ide/shared';

interface Peer {
  socket: WebSocket;
  userId: string;
  username: string;
  workspaceId: string;
}

export class CollaborationRoomManager {
  private wss: WebSocketServer | null = null;
  private rooms = new Map<string, Set<Peer>>();

  public initialize(server: HttpServer): WebSocketServer {
    this.wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request, socket, head) => {
      const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
      if (url.pathname === '/ws/collaboration') {
        this.wss?.handleUpgrade(request, socket, head, (ws) => {
          const workspaceId = url.searchParams.get('workspaceId') || 'ws_default';
          const userId = url.searchParams.get('userId') || `usr_${Date.now()}`;
          const username = url.searchParams.get('username') || 'Pair Programmer';
          this.wss?.emit('connection', ws, request, workspaceId, userId, username);
        });
      }
    });

    this.wss.on('connection', (socket: WebSocket, _req: unknown, workspaceId: string, userId: string, username: string) => {
      const peer: Peer = { socket, userId, username, workspaceId };

      if (!this.rooms.has(workspaceId)) {
        this.rooms.set(workspaceId, new Set());
      }
      const room = this.rooms.get(workspaceId)!;
      room.add(peer);

      logger.info(`Collaboration peer joined room: ${workspaceId} (${username} - ${userId})`);

      // Broadcast user_joined to other peers
      this.broadcast(workspaceId, peer, {
        event: 'workspace:user_joined',
        payload: { workspaceId, userId, username },
        timestamp: new Date().toISOString(),
      });

      socket.on('message', (raw: Buffer | string) => {
        try {
          const msg = JSON.parse(raw.toString()) as BaseSocketMessage;
          if (msg.event === 'collaboration:sync') {
            // Relay CRDT sync update to other peers in room
            this.broadcast(workspaceId, peer, msg);
          }
        } catch {
          // Ignore malformed payloads
        }
      });

      socket.on('close', () => {
        room.delete(peer);
        if (room.size === 0) {
          this.rooms.delete(workspaceId);
        } else {
          this.broadcast(workspaceId, peer, {
            event: 'workspace:user_left',
            payload: { workspaceId, userId, username },
            timestamp: new Date().toISOString(),
          });
        }
        logger.info(`Collaboration peer left room: ${workspaceId} (${username})`);
      });
    });

    return this.wss;
  }

  private broadcast(workspaceId: string, sender: Peer, message: BaseSocketMessage) {
    const room = this.rooms.get(workspaceId);
    if (!room) return;

    const payload = JSON.stringify(message);
    for (const peer of room) {
      if (peer !== sender && peer.socket.readyState === WebSocket.OPEN) {
        peer.socket.send(payload);
      }
    }
  }

  public getRoomPeerCount(workspaceId: string): number {
    return this.rooms.get(workspaceId)?.size || 0;
  }

  public closeAll() {
    for (const room of this.rooms.values()) {
      for (const peer of room) {
        peer.socket.close();
      }
    }
    this.rooms.clear();
    this.wss?.close();
  }
}

export const collaborationManager = new CollaborationRoomManager();

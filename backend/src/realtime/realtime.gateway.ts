import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/realtime',
})
@Injectable()
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);
  private userRooms = new Map<string, Set<string>>();

  @WebSocketServer()
  server!: Server;

  constructor(private config: ConfigService) {}

  afterInit(server: Server) {
    this.logger.log('Socket.IO gateway initialized');
  }

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token || client.handshake.query?.token;
    if (!token) {
      this.logger.warn(`Client ${client.id} connected without token, disconnecting`);
      client.disconnect();
      return;
    }

    try {
      const payload = this.verifyToken(token as string);
      const userId = payload.sub || payload.id;
      const tenantId = payload.tenantId || 'default';

      client.data.userId = userId;
      client.data.tenantId = tenantId;

      client.join(`user:${userId}`);
      client.join(`tenant:${tenantId}`);

      if (!this.userRooms.has(userId)) {
        this.userRooms.set(userId, new Set());
      }
      this.userRooms.get(userId)!.add(client.id);

      this.logger.log(`Client ${client.id} connected (user: ${userId}, tenant: ${tenantId})`);
      client.emit('connected', { userId, tenantId });
    } catch (err: any) {
      this.logger.warn(`Client ${client.id} auth failed: ${err.message}`);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    if (userId && this.userRooms.has(userId)) {
      this.userRooms.get(userId)!.delete(client.id);
      if (this.userRooms.get(userId)!.size === 0) {
        this.userRooms.delete(userId);
      }
    }
    this.logger.log(`Client ${client.id} disconnected`);
  }

  emit(event: string, data: any) {
    this.server?.emit(event, data);
  }

  emitToUser(userId: string, event: string, data: any) {
    this.server?.to(`user:${userId}`).emit(event, data);
  }

  emitToTenant(tenantId: string, event: string, data: any) {
    this.server?.to(`tenant:${tenantId}`).emit(event, data);
  }

  emitToRoom(room: string, event: string, data: any) {
    this.server?.to(room).emit(event, data);
  }

  private verifyToken(token: string): any {
    const jwt = require('jsonwebtoken');
    const secret = this.config.get<string>('JWT_SECRET') || 'secret';
    return jwt.verify(token, secret);
  }
}

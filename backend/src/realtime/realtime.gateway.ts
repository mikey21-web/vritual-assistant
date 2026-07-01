import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Real-time event bus for the application.
 *
 * Implementation note: This service is a stub that logs events.
 * To enable actual WebSocket delivery, install socket.io and uncomment
 * the SocketIOServer wiring below. The frontend SSE hook will poll
 * this endpoint via /api/realtime/subscribe.
 *
 * Events:
 * - lead:new, lead:scored, lead:updated
 * - conversation:new
 * - failure:new
 */
@Injectable()
export class RealtimeGateway {
  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(private config: ConfigService) {}

  emit(event: string, data: any) {
    this.logger.debug(`Realtime event: ${event}`);
    // In production: forward to WebSocket/SSE clients
    if (this.config.get<string>('REALTIME_ENABLED') === 'true') {
      // Socket.IO attach happens here when enabled
    }
  }

  emitToRoom(room: string, event: string, data: any) {
    this.logger.debug(`Realtime event to ${room}: ${event}`);
  }
}


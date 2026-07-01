import { Controller, Get, Res, Sse, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { interval, Observable, map, takeUntil } from 'rxjs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Subject } from 'rxjs';
import { Public } from '../auth/public.decorator';

@ApiTags('Realtime')
@Controller('realtime')
export class RealtimeController {
  private connections = new Map<string, Subject<any>>();

  /**
   * Server-Sent Events endpoint for real-time updates.
   * Clients connect via EventSource API.
   */
  @Public()
  @Sse('subscribe')
  subscribe(): Observable<MessageEvent> {
    const id = Math.random().toString(36).slice(2);
    const subject = new Subject<any>();
    this.connections.set(id, subject);

    setTimeout(() => {
      this.connections.delete(id);
      subject.complete();
    }, 30 * 60 * 1000); // 30 min max connection

    return new Observable(observer => {
      const sub = subject.subscribe({
        next: (data) => observer.next({ data: { ...data, id } } as MessageEvent),
        error: (err) => observer.error(err),
        complete: () => observer.complete(),
      });
      // Heartbeat every 30s to keep connection alive
      const heartbeat = setInterval(() => {
        observer.next({ type: 'heartbeat', data: { ts: Date.now() } } as MessageEvent);
      }, 30000);
      return () => {
        sub.unsubscribe();
        clearInterval(heartbeat);
        this.connections.delete(id);
      };
    });
  }

  @Public()
  @Get('health')
  health() {
    return { activeConnections: this.connections.size, status: 'ok' };
  }
}

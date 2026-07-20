import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PortalIntegrationsService } from './portal-integrations.service';

const KNOWN_PROVIDERS = ['indiamart', '99acres', 'justdial', 'magicbricks', 'housing', 'tradeindia'];
const STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000; // 7 days — "this source stopped sending, someone should look"

export interface ConnectorHealth {
  provider: string;
  status: 'ACTIVE' | 'STALE' | 'NEVER_CONNECTED';
  lastEventAt: Date | null;
  last7DaysCount: number;
  createdCount7d: number;
  duplicateCount7d: number;
  failedCount7d: number;
  lastFailedEventAt: Date | null;
  lastFailedEventId: string | null;
}

/**
 * Reads existing WebhookEvent rows (already written by every portal handler
 * on the success path) into a per-connector health view (spec 48.13) — last
 * successful event, 7-day volume, and whether a source has gone silent.
 * Failure-path logging (a webhook that errors before reaching WebhookEvent)
 * is a follow-up: today this only sees successfully processed events.
 */
@Injectable()
export class PortalHealthService {
  constructor(
    private prisma: PrismaService,
    private portalService: PortalIntegrationsService,
  ) {}

  async getHealth(): Promise<ConnectorHealth[]> {
    const since = new Date(Date.now() - STALE_AFTER_MS);

    const results = await Promise.all(
      KNOWN_PROVIDERS.map(async (provider): Promise<ConnectorHealth> => {
        const [lastEvent, recent, lastFailed] = await Promise.all([
          this.prisma.webhookEvent.findFirst({ where: { provider }, orderBy: { createdAt: 'desc' } }),
          this.prisma.webhookEvent.findMany({ where: { provider, createdAt: { gte: since } }, select: { processedResult: true, status: true } }),
          this.prisma.webhookEvent.findFirst({ where: { provider, status: 'failed' }, orderBy: { createdAt: 'desc' } }),
        ]);

        const createdCount7d = recent.filter(r => (r.processedResult as any)?.status === 'created').length;
        const duplicateCount7d = recent.filter(r => (r.processedResult as any)?.status === 'duplicate').length;
        const failedCount7d = recent.filter(r => r.status === 'failed').length;

        let status: ConnectorHealth['status'] = 'NEVER_CONNECTED';
        if (lastEvent) status = lastEvent.createdAt < since ? 'STALE' : 'ACTIVE';

        return {
          provider,
          status,
          lastEventAt: lastEvent?.createdAt ?? null,
          last7DaysCount: recent.length,
          createdCount7d,
          duplicateCount7d,
          failedCount7d,
          lastFailedEventAt: lastFailed?.createdAt ?? null,
          lastFailedEventId: lastFailed?.id ?? null,
        };
      }),
    );

    return results;
  }

  async replayFailed(provider: string): Promise<{ status: string; message: string }> {
    const failed = await this.prisma.webhookEvent.findFirst({
      where: { provider, status: 'failed' },
      orderBy: { createdAt: 'desc' },
    });
    if (!failed) throw new NotFoundException(`No failed events for provider: ${provider}`);

    const raw = failed.rawPayload as any;
    const handlerMap: Record<string, (raw: any) => Promise<any>> = {
      indiamart: (r) => this.portalService.handleIndiaMART(r),
      '99acres': (r) => this.portalService.handle99Acres(r),
      justdial: (r) => this.portalService.handleJustDial(r),
      magicbricks: (r) => this.portalService.handleMagicBricks(r),
      housing: (r) => this.portalService.handleHousing(r),
      tradeindia: (r) => this.portalService.handleTradeIndia(r),
    };
    const handler = handlerMap[provider];
    if (!handler) throw new NotFoundException(`Unknown provider: ${provider}`);

    try {
      const result = await handler(raw);
      return { status: 'replayed', message: `Replayed ${provider} event — ${result.status}` };
    } catch (e: any) {
      return { status: 'failed', message: `Replay failed: ${e.message}` };
    }
  }
}

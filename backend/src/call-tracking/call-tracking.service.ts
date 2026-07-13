import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { ContactsService } from '../contacts/contacts.service';
import { LeadsService } from '../leads/leads.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { getTenantId } from '../shared/tenant-helper';
import { hashApiKey } from './device-auth.guard';
import { CallSummaryService } from './call-summary.service';
import { CallSyncDto, SyncLogsQueryDto } from './dto/call-tracking.dto';

const PAIRING_CODE_TTL_MS = 10 * 60 * 1000;

function randomPairingCode(): string {
  // 6-digit, human-typeable code for manual entry alongside the QR
  return crypto.randomInt(100000, 999999).toString();
}

@Injectable()
export class CallTrackingService {
  private readonly logger = new Logger(CallTrackingService.name);

  constructor(
    private prisma: PrismaService,
    private contactsService: ContactsService,
    private leadsService: LeadsService,
    private realtime: RealtimeGateway,
    private callSummaryService: CallSummaryService,
    private config: ConfigService,
    private http: HttpService,
  ) {}

  async generatePairingCode(userId: string, name: string | undefined, req?: any) {
    const pairingCode = randomPairingCode();
    const device = await this.prisma.device.create({
      data: {
        tenantId: getTenantId(req),
        userId,
        name,
        pairingCode,
        pairingCodeExpiresAt: new Date(Date.now() + PAIRING_CODE_TTL_MS),
      },
    });
    return { pairingCode, expiresAt: device.pairingCodeExpiresAt };
  }

  async pairDevice(pairingCode: string, model?: string, platform?: string) {
    const device = await this.prisma.device.findUnique({ where: { pairingCode } });
    if (!device || !device.pairingCodeExpiresAt || device.pairingCodeExpiresAt < new Date()) {
      throw new BadRequestException('Pairing code is invalid or expired');
    }

    const apiKey = 'dev_' + crypto.randomBytes(32).toString('hex');
    await this.prisma.device.update({
      where: { id: device.id },
      data: {
        apiKeyHash: hashApiKey(apiKey),
        pairingCode: null,
        pairingCodeExpiresAt: null,
        model: model ?? device.model,
        platform: platform ?? device.platform,
        lastSeenAt: new Date(),
      },
    });

    return { apiKey, deviceId: device.id, message: 'Save this key — it will not be shown again.' };
  }

  async syncCalls(device: { id: string; tenantId: string }, dto: CallSyncDto) {
    const results: Array<{ localId?: string; callLogId: string; status: 'synced' }> = [];

    for (const entry of dto.calls) {
      const req = { tenantId: device.tenantId };
      const contactPhone = entry.direction === 'INBOUND' ? entry.fromNumber : entry.toNumber;

      const contact = await this.contactsService.findOrCreate({ phone: contactPhone }, req);

      const existingLead = await this.prisma.lead.findFirst({
        where: { contactId: contact.id, status: { notIn: ['LOST', 'CONVERTED', 'SPAM'] } },
        orderBy: { createdAt: 'desc' },
      });

      const lead = existingLead || await this.leadsService.create({
        contactId: contact.id,
        tenantId: device.tenantId,
        source: 'PHONE_CALL',
        metadata: { channel: 'call_tracking', callSource: entry.source },
      });

      const callLog = await this.prisma.callLog.create({
        data: {
          tenantId: device.tenantId,
          leadId: lead.id,
          contactId: contact.id,
          deviceId: device.id,
          direction: entry.direction,
          status: (entry.status as any) || 'COMPLETED',
          fromNumber: entry.fromNumber,
          toNumber: entry.toNumber,
          durationSec: entry.durationSec,
          recordingUrl: entry.recordingUrl,
          source: entry.source,
          recordedLocally: !!entry.recordingUrl,
          syncedAt: new Date(),
          createdAt: new Date(entry.startedAt),
        },
      });

      this.realtime.emitToTenant(device.tenantId, 'call.synced', {
        callLogId: callLog.id,
        leadId: lead.id,
        contactId: contact.id,
        direction: callLog.direction,
        source: callLog.source,
        durationSec: callLog.durationSec,
        createdAt: callLog.createdAt,
      });

      // Fire-and-forget: push to CRM integrations + webhooks
      this.pushToIntegrationsAndWebhooks(device.tenantId, callLog, contact).catch((err: Error) =>
        this.logger.error(`Background sync push failed for call ${callLog.id}: ${err.message}`),
      );

      results.push({ localId: entry.localId, callLogId: callLog.id, status: 'synced' });
    }

    return { results };
  }

  async attachRecording(device: { id: string; tenantId: string }, callLogId: string, file: Express.Multer.File) {
    const callLog = await this.prisma.callLog.findFirst({ where: { id: callLogId, deviceId: device.id, tenantId: device.tenantId } });
    if (!callLog) throw new NotFoundException('Call log not found for this device');

    const storagePath = path.resolve(process.env.STORAGE_PATH || './uploads', 'call-recordings');
    fs.mkdirSync(storagePath, { recursive: true });
    const fileName = `${callLog.id}-${crypto.randomBytes(6).toString('hex')}${path.extname(file.originalname) || '.m4a'}`;
    fs.writeFileSync(path.join(storagePath, fileName), file.buffer);

    const updated = await this.prisma.callLog.update({
      where: { id: callLog.id },
      data: { recordingUrl: `/uploads/call-recordings/${fileName}`, recordedLocally: true },
    });

    const openaiKey = this.config.get<string>('OPENAI_API_KEY');
    if (openaiKey) {
      this.callSummaryService.summarizeRecording(callLog.id).catch((err: Error) =>
        this.logger.error(`Background summarization failed for call ${callLog.id}: ${err.message}`),
      );
    } else {
      await this.prisma.callLog.update({
        where: { id: callLog.id },
        data: { summaryStatus: 'SKIPPED' },
      });
    }

    return updated;
  }

  async findAll(query: any = {}, req?: any) {
    const { page = 1, limit = 20, source, direction } = query;
    const where: any = { tenantId: getTenantId(req) };
    if (source) where.source = source;
    if (direction) where.direction = direction;
    const [data, total] = await Promise.all([
      this.prisma.callLog.findMany({
        where, skip: (+page - 1) * +limit, take: +limit, orderBy: { createdAt: 'desc' },
        include: { contact: { select: { id: true, name: true, phone: true } }, lead: { select: { id: true, status: true } }, device: { select: { id: true, name: true, model: true } } },
      }),
      this.prisma.callLog.count({ where }),
    ]);
    return { data, meta: { total, page: +page, limit: +limit } };
  }

  async stats(req?: any) {
    const tenantId = getTenantId(req);
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [todayCount, missedCount, durations] = await Promise.all([
      this.prisma.callLog.count({ where: { tenantId, createdAt: { gte: startOfDay } } }),
      this.prisma.callLog.count({ where: { tenantId, createdAt: { gte: startOfDay }, status: { in: ['NO_ANSWER', 'BUSY', 'FAILED', 'MISSED'] } } }),
      this.prisma.callLog.findMany({ where: { tenantId, createdAt: { gte: startOfDay }, durationSec: { not: null } }, select: { durationSec: true } }),
    ]);

    const avgDurationSec = durations.length
      ? Math.round(durations.reduce((sum, c) => sum + (c.durationSec || 0), 0) / durations.length)
      : 0;

    return { callsToday: todayCount, missedToday: missedCount, avgDurationSec };
  }

  async listDevices(req?: any) {
    return this.prisma.device.findMany({
      where: { tenantId: getTenantId(req) },
      select: { id: true, name: true, platform: true, model: true, lastSeenAt: true, revokedAt: true, createdAt: true, pairingCode: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeDevice(id: string, req?: any) {
    await this.prisma.device.updateMany({ where: { id, tenantId: getTenantId(req) }, data: { revokedAt: new Date(), apiKeyHash: null } });
    return { message: 'Device revoked.' };
  }

  // ─── Analytics ────────────────────────────────────────────────────────────

  async analytics(range: '7d' | '30d' | '90d' = '7d', req?: any) {
    const tenantId = getTenantId(req);
    const rangeDays = range === '90d' ? 90 : range === '30d' ? 30 : 7;
    const since = new Date();
    since.setDate(since.getDate() - rangeDays);
    since.setHours(0, 0, 0, 0);

    const where = { tenantId, createdAt: { gte: since } };

    // ── Base counts ──
    const [totalCalls, durationRows, sourceRows, directionRows, callsForTime, agentRows, contactRows] = await Promise.all([
      this.prisma.callLog.count({ where }),
      this.prisma.callLog.findMany({ where: { ...where, durationSec: { not: null } }, select: { durationSec: true } }),

      // bySource
      this.prisma.callLog.groupBy({ by: ['source'], where, _count: { id: true } }),

      // byDirection
      this.prisma.callLog.groupBy({ by: ['direction'], where, _count: { id: true } }),

      // overTime — fetch all for date groupping
      this.prisma.callLog.findMany({
        where,
        select: { id: true, status: true, durationSec: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),

      // byAgent — group by agentId
      this.prisma.callLog.groupBy({ by: ['agentId'], where, _count: { id: true }, _avg: { durationSec: true }, _sum: { durationSec: true } }),

      // byContact — group by contactId
      this.prisma.callLog.groupBy({ by: ['contactId'], where, _count: { id: true }, _sum: { durationSec: true } }),
    ]);

    const totalDurationSec = durationRows.reduce((s, r) => s + (r.durationSec || 0), 0);
    const avgDurationSec = totalCalls > 0 ? Math.round(totalDurationSec / totalCalls) : 0;

    const MISSED_STATUSES = ['NO_ANSWER', 'BUSY', 'FAILED', 'MISSED'];

    // Count missed vs answered (COMPLETED)
    const statusCounts = callsForTime.reduce(
      (acc, c) => {
        if (MISSED_STATUSES.includes(c.status)) acc.missed++;
        else if (c.status === 'COMPLETED') acc.answered++;
        return acc;
      },
      { missed: 0, answered: 0 },
    );
    const answeredRate = totalCalls > 0 ? Math.round((statusCounts.answered / totalCalls) * 100) / 100 : 0;

    // ── overTime: group by date ──
    const dateMap = new Map<string, { count: number; missed: number; durations: number[] }>();
    for (const c of callsForTime) {
      const key = c.createdAt.toISOString().slice(0, 10);
      if (!dateMap.has(key)) dateMap.set(key, { count: 0, missed: 0, durations: [] });
      const bucket = dateMap.get(key)!;
      bucket.count++;
      if (MISSED_STATUSES.includes(c.status)) bucket.missed++;
      if (c.durationSec) bucket.durations.push(c.durationSec);
    }
    const overTime = Array.from(dateMap.entries())
      .map(([date, v]) => ({
        date,
        count: v.count,
        missed: v.missed,
        avgDuration: v.durations.length ? Math.round(v.durations.reduce((a, b) => a + b, 0) / v.durations.length) : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // ── byAgent: resolve names ──
    const agentIds = agentRows.filter((r) => r.agentId).map((r) => r.agentId!);
    const agents = agentIds.length
      ? await this.prisma.user.findMany({ where: { id: { in: agentIds } }, select: { id: true, name: true } })
      : [];
    const agentNameMap = new Map(agents.map((a) => [a.id, a.name]));
    const byAgent = agentRows
      .filter((r) => r.agentId)
      .map((r) => ({
        userId: r.agentId!,
        name: agentNameMap.get(r.agentId!) || 'Unknown',
        count: r._count.id,
        avgDuration: r._avg.durationSec ? Math.round(r._avg.durationSec) : 0,
        totalDuration: r._sum.durationSec || 0,
      }));

    // ── byContact: resolve names ──
    const contactIds = contactRows.filter((r) => r.contactId).map((r) => r.contactId!);
    const contacts = contactIds.length
      ? await this.prisma.contact.findMany({ where: { id: { in: contactIds } }, select: { id: true, name: true, company: true } })
      : [];
    const contactMap = new Map(contacts.map((c) => [c.id, c]));
    const byContact = contactRows
      .filter((r) => r.contactId)
      .map((r) => {
        const contact = contactMap.get(r.contactId!);
        return {
          contactId: r.contactId!,
          name: contact?.name || 'Unknown',
          company: contact?.company || null,
          count: r._count.id,
          totalDuration: r._sum.durationSec || 0,
        };
      });

    const bySource: Record<string, number> = {};
    for (const r of sourceRows) bySource[r.source] = r._count.id;

    const byDirection: Record<string, number> = {};
    for (const r of directionRows) byDirection[r.direction] = r._count.id;

    return {
      totalCalls,
      totalDurationSec,
      avgDurationSec,
      missedCalls: statusCounts.missed,
      answeredCalls: statusCounts.answered,
      answeredRate,
      bySource,
      byDirection,
      overTime,
      byAgent,
      byContact,
    };
  }

  // ─── Sync Logs ────────────────────────────────────────────────────────────

  async syncLogs(query: SyncLogsQueryDto, req?: any) {
    const tenantId = getTenantId(req);
    const { page = 1, limit = 20, status } = query;
    const where: any = { tenantId };
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.callSyncLog.findMany({
        where,
        skip: (+page - 1) * +limit,
        take: +limit,
        orderBy: { attemptAt: 'desc' },
        include: {
          callLog: {
            select: { id: true, direction: true, fromNumber: true, toNumber: true, durationSec: true, status: true, createdAt: true },
          },
          integration: { select: { id: true, type: true, name: true } },
          webhook: { select: { id: true, name: true, url: true } },
        },
      }),
      this.prisma.callSyncLog.count({ where }),
    ]);

    return { data, meta: { total, page: +page, limit: +limit } };
  }

  async retrySync(id: string, req?: any) {
    const tenantId = getTenantId(req);
    const syncLog = await this.prisma.callSyncLog.findFirst({
      where: { id, tenantId, status: 'FAILED' },
      include: {
        callLog: true,
        integration: true,
        webhook: true,
      },
    });
    if (!syncLog) throw new NotFoundException('Failed sync log not found');

    const payload = this.buildCallPayload(syncLog.callLog);
    let newStatus = 'SUCCESS';
    let error: string | null = null;

    try {
      if (syncLog.webhookId && syncLog.webhook) {
        await this.postToWebhook(syncLog.webhook, payload);
      } else if (syncLog.integrationId && syncLog.integration) {
        await this.postToCrm(syncLog.integration, payload);
      } else {
        throw new Error('No integration or webhook associated with this sync log');
      }
    } catch (err: any) {
      newStatus = 'FAILED';
      error = err.message || 'Unknown error';
    }

    await this.prisma.callSyncLog.update({
      where: { id },
      data: { status: newStatus, error, attemptAt: new Date() },
    });

    return { id, status: newStatus, error };
  }

  // ─── Post-Call Notes ──────────────────────────────────────────────────────

  async updateNotes(id: string, notes: string, req?: any) {
    const tenantId = getTenantId(req);
    const callLog = await this.prisma.callLog.findFirst({ where: { id, tenantId } });
    if (!callLog) throw new NotFoundException('Call log not found');

    const updated = await this.prisma.callLog.update({
      where: { id },
      data: { notes },
      select: { id: true, notes: true },
    });
    return updated;
  }

  // ─── Fire-and-forget: push to CRM integrations & outbound webhooks ────────

  private async pushToIntegrationsAndWebhooks(tenantId: string, callLog: any, contact: any) {
    const payload = this.buildCallPayload(callLog);

    // Active CRM integrations for this tenant
    const integrations = await this.prisma.integration.findMany({
      where: { tenantId, isActive: true, type: { in: ['hubspot', 'salesforce', 'zoho'] } },
    });

    for (const integration of integrations) {
      this.pushSingleCrm(integration, callLog, payload, tenantId).catch((err: Error) =>
        this.logger.error(`CRM push to ${integration.type} failed for call ${callLog.id}: ${err.message}`),
      );
    }

    // Active outbound webhooks subscribed to "call.synced"
    const webhooks = await this.prisma.outboundWebhook.findMany({
      where: { tenantId, active: true, events: { has: 'call.synced' } },
    });

    for (const webhook of webhooks) {
      this.pushSingleWebhook(webhook, callLog, payload, tenantId).catch((err: Error) =>
        this.logger.error(`Webhook push to ${webhook.url} failed for call ${callLog.id}: ${err.message}`),
      );
    }
  }

  private async pushSingleCrm(integration: any, callLog: any, payload: any, tenantId: string) {
    try {
      await this.postToCrm(integration, payload);
      await this.prisma.callSyncLog.create({
        data: { tenantId, callLogId: callLog.id, integrationId: integration.id, crmType: integration.type, status: 'SUCCESS' },
      });
    } catch (err: any) {
      await this.prisma.callSyncLog.create({
        data: {
          tenantId, callLogId: callLog.id, integrationId: integration.id, crmType: integration.type, status: 'FAILED',
          error: err.message || 'Unknown error',
        },
      });
    }
  }

  private async pushSingleWebhook(webhook: any, callLog: any, payload: any, tenantId: string) {
    try {
      await this.postToWebhook(webhook, payload);
      await this.prisma.callSyncLog.create({
        data: { tenantId, callLogId: callLog.id, webhookId: webhook.id, crmType: 'webhook', status: 'SUCCESS' },
      });
    } catch (err: any) {
      await this.prisma.callSyncLog.create({
        data: {
          tenantId, callLogId: callLog.id, webhookId: webhook.id, crmType: 'webhook', status: 'FAILED',
          error: err.message || 'Unknown error',
        },
      });
    }
  }

  private buildCallPayload(callLog: any) {
    return {
      event: 'call.synced',
      callLogId: callLog.id,
      tenantId: callLog.tenantId,
      direction: callLog.direction,
      status: callLog.status,
      fromNumber: callLog.fromNumber,
      toNumber: callLog.toNumber,
      durationSec: callLog.durationSec,
      recordingUrl: callLog.recordingUrl,
      source: callLog.source,
      notes: callLog.notes,
      transcript: callLog.transcript,
      summary: callLog.summary,
      createdAt: callLog.createdAt,
    };
  }

  private async postToCrm(integration: any, payload: any) {
    const url = integration.config?.apiUrl || integration.config?.instanceUrl;
    const apiKey = integration.config?.apiKey || integration.config?.accessToken;
    if (!url) throw new Error(`CRM integration ${integration.type} has no configured URL`);

    await firstValueFrom(
      this.http.post(`${url}/calls`, payload, {
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        timeout: 15000,
      }),
    );
  }

  private async postToWebhook(webhook: any, payload: any) {
    const signature = this.signPayload(payload, webhook.secret);
    await firstValueFrom(
      this.http.post(webhook.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': 'call.synced',
        },
        timeout: 15000,
      }),
    );
  }

  private signPayload(payload: any, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret || '');
    hmac.update(JSON.stringify(payload));
    return hmac.digest('hex');
  }

  // ─── Recording Retention ─────────────────────────────────────────────────

  async getRecordingRetention(req?: any) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: getTenantId(req) },
      select: { settings: true },
    });
    return { days: (tenant?.settings as any)?.recordingRetentionDays ?? null };
  }

  async setRecordingRetention(days: number | null, req?: any) {
    const tenantId = getTenantId(req);
    const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const current = (tenant.settings as any) || {};
    const settings = { ...current, recordingRetentionDays: days };
    if (days == null) delete settings.recordingRetentionDays;

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { settings },
    });
    return { days };
  }
}

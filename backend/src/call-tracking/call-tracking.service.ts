import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { ContactsService } from '../contacts/contacts.service';
import { LeadsService } from '../leads/leads.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { getTenantId } from '../shared/tenant-helper';
import { hashApiKey } from './device-auth.guard';
import { CallSyncDto } from './dto/call-tracking.dto';

const PAIRING_CODE_TTL_MS = 10 * 60 * 1000;

function randomPairingCode(): string {
  // 6-digit, human-typeable code for manual entry alongside the QR
  return crypto.randomInt(100000, 999999).toString();
}

@Injectable()
export class CallTrackingService {
  constructor(
    private prisma: PrismaService,
    private contactsService: ContactsService,
    private leadsService: LeadsService,
    private realtime: RealtimeGateway,
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

    return this.prisma.callLog.update({
      where: { id: callLog.id },
      data: { recordingUrl: `/uploads/call-recordings/${fileName}`, recordedLocally: true },
    });
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
      this.prisma.callLog.count({ where: { tenantId, createdAt: { gte: startOfDay }, status: { in: ['NO_ANSWER', 'BUSY', 'FAILED'] } } }),
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
}

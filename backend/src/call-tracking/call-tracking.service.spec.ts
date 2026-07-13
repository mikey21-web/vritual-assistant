import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { CallTrackingService } from './call-tracking.service';
import { CallSummaryService } from './call-summary.service';
import { PrismaService } from '../prisma/prisma.service';
import { ContactsService } from '../contacts/contacts.service';
import { LeadsService } from '../leads/leads.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

describe('CallTrackingService', () => {
  let service: CallTrackingService;
  let prisma: any;
  let contacts: any;
  let leads: any;
  let realtime: any;
  let callSummary: any;
  let config: any;
  let httpService: any;

  const mockContact = { id: 'contact-1', phone: '+15551234567' };
  const mockLead = { id: 'lead-1', status: 'NEW', contactId: 'contact-1' };
  const mockCallLog = {
    id: 'call-1', direction: 'INBOUND', source: 'SIM', durationSec: 42, createdAt: new Date('2026-07-13T10:00:00Z'),
  };

  beforeEach(async () => {
    prisma = {
      device: {
        create: jest.fn().mockResolvedValue({ id: 'device-1', pairingCode: '123456', pairingCodeExpiresAt: new Date(Date.now() + 60000) }),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      lead: { findFirst: jest.fn().mockResolvedValue(null) },
      callLog: {
        create: jest.fn().mockResolvedValue(mockCallLog),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn(),
      },
    };
    contacts = { findOrCreate: jest.fn().mockResolvedValue(mockContact) };
    leads = { create: jest.fn().mockResolvedValue(mockLead) };
    realtime = { emitToTenant: jest.fn() };
    callSummary = { summarize: jest.fn().mockResolvedValue(undefined) };
    config = { get: jest.fn().mockReturnValue(undefined) };
    httpService = { post: jest.fn().mockReturnValue(of({ data: {} })) };

    const module = await Test.createTestingModule({
      providers: [
        CallTrackingService,
        { provide: PrismaService, useValue: prisma },
        { provide: ContactsService, useValue: contacts },
        { provide: LeadsService, useValue: leads },
        { provide: RealtimeGateway, useValue: realtime },
        { provide: CallSummaryService, useValue: callSummary },
        { provide: ConfigService, useValue: config },
        { provide: HttpService, useValue: httpService },
      ],
    }).compile();

    service = module.get(CallTrackingService);
  });

  describe('pairDevice', () => {
    it('rejects an unknown or expired pairing code', async () => {
      prisma.device.findUnique.mockResolvedValue(null);
      await expect(service.pairDevice('000000')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an expired pairing code even if the device row exists', async () => {
      prisma.device.findUnique.mockResolvedValue({ id: 'device-1', pairingCodeExpiresAt: new Date(Date.now() - 1000) });
      await expect(service.pairDevice('123456')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('issues an API key and clears the pairing code on success', async () => {
      prisma.device.findUnique.mockResolvedValue({ id: 'device-1', pairingCodeExpiresAt: new Date(Date.now() + 60000), model: null, platform: 'android' });
      const result = await service.pairDevice('123456', 'Pixel 8', 'android');
      expect(result.apiKey).toMatch(/^dev_/);
      expect(prisma.device.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'device-1' },
        data: expect.objectContaining({ pairingCode: null, pairingCodeExpiresAt: null }),
      }));
    });
  });

  describe('syncCalls', () => {
    const device = { id: 'device-1', tenantId: 'tenant-1' };

    it('attributes an inbound SIM call to a contact/lead and emits a realtime event', async () => {
      const result = await service.syncCalls(device, {
        calls: [{
          localId: 'local-1',
          fromNumber: '+15551234567',
          toNumber: 'self',
          direction: 'INBOUND',
          source: 'SIM',
          startedAt: '2026-07-13T10:00:00.000Z',
          durationSec: 42,
        }],
      });

      expect(contacts.findOrCreate).toHaveBeenCalledWith({ phone: '+15551234567' }, { tenantId: 'tenant-1' });
      expect(leads.create).toHaveBeenCalledWith(expect.objectContaining({ contactId: 'contact-1', tenantId: 'tenant-1', source: 'PHONE_CALL' }));
      expect(prisma.callLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ tenantId: 'tenant-1', deviceId: 'device-1', source: 'SIM', direction: 'INBOUND' }),
      }));
      expect(realtime.emitToTenant).toHaveBeenCalledWith('tenant-1', 'call.synced', expect.objectContaining({ callLogId: 'call-1' }));
      expect(result.results).toEqual([{ localId: 'local-1', callLogId: 'call-1', status: 'synced' }]);
    });

    it('reuses an existing open lead instead of creating a new one', async () => {
      prisma.lead.findFirst.mockResolvedValue(mockLead);
      await service.syncCalls(device, {
        calls: [{
          localId: 'local-2',
          fromNumber: 'self',
          toNumber: '+15559876543',
          direction: 'OUTBOUND',
          source: 'WHATSAPP',
          startedAt: '2026-07-13T11:00:00.000Z',
        }],
      });
      expect(leads.create).not.toHaveBeenCalled();
      expect(prisma.callLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ leadId: 'lead-1' }) }));
    });

    it('resolves the outbound counterpart number from toNumber, not fromNumber', async () => {
      await service.syncCalls(device, {
        calls: [{
          localId: 'local-3',
          fromNumber: 'self',
          toNumber: '+15559876543',
          direction: 'OUTBOUND',
          source: 'SIM',
          startedAt: '2026-07-13T12:00:00.000Z',
        }],
      });
      expect(contacts.findOrCreate).toHaveBeenCalledWith({ phone: '+15559876543' }, { tenantId: 'tenant-1' });
    });
  });
});

import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { CallTrackingService } from './call-tracking.service';
import { CallSummaryService } from './call-summary.service';
import { PrismaService } from '../prisma/prisma.service';
import { ContactsService } from '../contacts/contacts.service';
import { LeadsService } from '../leads/leads.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

describe('CallTrackingService.updateDisposition', () => {
  let service: CallTrackingService;
  let prisma: any;

  const callLog = { id: 'call-1', tenantId: 'default-tenant', leadId: 'lead-1' };

  beforeEach(async () => {
    prisma = {
      callLog: {
        findFirst: jest.fn().mockResolvedValue(callLog),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'call-1', leadId: 'lead-1', ...data })),
      },
      task: { create: jest.fn().mockResolvedValue({ id: 'task-1' }) },
    };

    const module = await Test.createTestingModule({
      providers: [
        CallTrackingService,
        { provide: PrismaService, useValue: prisma },
        { provide: ContactsService, useValue: {} },
        { provide: LeadsService, useValue: {} },
        { provide: RealtimeGateway, useValue: { emitToTenant: jest.fn() } },
        { provide: CallSummaryService, useValue: {} },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: HttpService, useValue: {} },
      ],
    }).compile();

    service = module.get(CallTrackingService);
  });

  it('records a disposition on the call log', async () => {
    const updated = await service.updateDisposition('call-1', 'site_visit_scheduled', undefined);
    expect(updated.disposition).toBe('site_visit_scheduled');
  });

  it('creates a follow-up task when a next action date is given', async () => {
    await service.updateDisposition('call-1', 'connected_follow_up', '2026-08-01T10:00:00Z');
    expect(prisma.task.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ leadId: 'lead-1', source: 'call_disposition' }) }),
    );
  });

  it('does not create a task when no next action date is given', async () => {
    await service.updateDisposition('call-1', 'not_interested', undefined);
    expect(prisma.task.create).not.toHaveBeenCalled();
  });

  it('throws when the call log does not exist for this tenant', async () => {
    prisma.callLog.findFirst.mockResolvedValue(null);
    await expect(service.updateDisposition('nope', 'not_interested', undefined)).rejects.toThrow(NotFoundException);
  });
});

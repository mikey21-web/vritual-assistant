import { Test, TestingModule } from '@nestjs/testing';
import { MarketingEventsService } from './marketing-events.service';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

describe('MarketingEventsService', () => {
  let service: MarketingEventsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      marketingEvent: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'evt-1', ...data })),
        findFirst: jest.fn().mockResolvedValue({ id: 'evt-1', tenantId: 't1', name: 'Launch', startAt: new Date() }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      marketingEventInvitee: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'inv-1', ...data })),
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue({ id: 'inv-1', leadId: 'l1', eventId: 'evt-1', qrCheckInToken: null }),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'inv-1', ...data })),
        findMany: jest.fn().mockResolvedValue([]),
      },
      lead: { findFirst: jest.fn().mockResolvedValue({ id: 'l1', tenantId: 't1' }), update: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketingEventsService,
        { provide: PrismaService, useValue: prisma },
        { provide: TimelineService, useValue: { add: jest.fn() } },
        { provide: AuditLogsService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get(MarketingEventsService);
  });

  it('creates an event', async () => {
    const e = await service.createEvent('t1', { name: 'Launch Event', eventType: 'LAUNCH', startAt: new Date().toISOString() });
    expect(e.name).toBe('Launch Event');
  });

  it('invites leads', async () => {
    prisma.marketingEventInvitee.findFirst.mockResolvedValue(null);
    const invites = await service.inviteLeads('t1', 'evt-1', ['l1']);
    expect(invites.length).toBe(1);
  });

  it('generates check-in token', async () => {
    const inv = await service.generateCheckInToken('inv-1');
    expect(inv.qrCheckInToken).toBeDefined();
  });

  it('checks in with valid token', async () => {
    const mockUpdate = jest.fn().mockResolvedValue({ id: 'inv-1', checkedInAt: new Date() });
    prisma.marketingEventInvitee.update = mockUpdate;
    prisma.marketingEventInvitee.findUnique.mockResolvedValue({ id: 'inv-1', leadId: 'l1', eventId: 'evt-1', checkedInAt: null, qrCheckInToken: 'token' });
    await service.checkIn('token');
    expect(mockUpdate).toHaveBeenCalled();
  });
});

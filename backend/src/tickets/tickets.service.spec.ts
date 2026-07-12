import { Test, TestingModule } from '@nestjs/testing';
import { TicketsService } from './tickets.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { NotFoundException } from '@nestjs/common';

describe('TicketsService', () => {
  let service: TicketsService;
  let prisma: any;
  let auditLogs: any;
  let realtime: any;
  let notifications: any;

  const mockTicket = {
    id: 'ticket-1',
    subject: 'Cannot log in',
    description: 'User cannot access account',
    status: 'OPEN',
    priority: 'MEDIUM',
    tenantId: 'default-tenant',
    leadId: 'lead-1',
    createdAt: new Date('2025-01-01T00:00:00Z'),
  };

  const mockSlaRule = {
    id: 'sla-1',
    name: 'Standard',
    active: true,
    responseTimeMinutes: 60,
    condition: {},
  };

  beforeEach(async () => {
    prisma = {
      ticket: {
        findMany: jest.fn().mockResolvedValue([mockTicket]),
        findUnique: jest.fn().mockResolvedValue(mockTicket),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...mockTicket, ...data })),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...mockTicket, ...data })),
        count: jest.fn().mockResolvedValue(1),
      },
      ticketComment: {
        create: jest.fn().mockResolvedValue({ id: 'comment-1', content: 'note', isInternal: true }),
      },
      knowledgeArticle: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      slaRule: {
        findMany: jest.fn().mockResolvedValue([mockSlaRule]),
      },
    };
    auditLogs = { log: jest.fn().mockResolvedValue(undefined) };
    realtime = { emit: jest.fn() };
    notifications = { create: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: auditLogs },
        { provide: RealtimeGateway, useValue: realtime },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
  });

  describe('create', () => {
    it('auto-assigns the matching active SLA rule and sets dueAt', async () => {
      const before = Date.now();
      await service.create({ subject: 'Test', description: 'desc' } as any, 'user-1');
      const createCall = prisma.ticket.create.mock.calls[0][0];
      expect(createCall.data.slaRuleId).toBe('sla-1');
      expect(createCall.data.dueAt.getTime()).toBeGreaterThanOrEqual(before + mockSlaRule.responseTimeMinutes * 60000 - 1000);
    });

    it('creates without an SLA rule when none is active', async () => {
      prisma.slaRule.findMany.mockResolvedValue([]);
      await service.create({ subject: 'Test', description: 'desc' } as any, 'user-1');
      const createCall = prisma.ticket.create.mock.calls[0][0];
      expect(createCall.data.slaRuleId).toBeUndefined();
      expect(createCall.data.dueAt).toBeUndefined();
    });

    it('prefers a rule whose condition.priority matches the ticket priority over the fastest rule', async () => {
      const fastGeneric = { id: 'sla-fast', active: true, responseTimeMinutes: 15, condition: {} };
      const slowUrgent = { id: 'sla-urgent', active: true, responseTimeMinutes: 30, condition: { priority: 'URGENT' } };
      prisma.slaRule.findMany.mockResolvedValue([fastGeneric, slowUrgent]);
      await service.create({ subject: 'Test', description: 'desc', priority: 'URGENT' } as any, 'user-1');
      const createCall = prisma.ticket.create.mock.calls[0][0];
      expect(createCall.data.slaRuleId).toBe('sla-urgent');
    });

    it('emits a ticket:new realtime event', async () => {
      await service.create({ subject: 'Test', description: 'desc' } as any, 'user-1');
      expect(realtime.emit).toHaveBeenCalledWith('ticket:new', expect.any(Object));
    });

    it('writes an audit log entry', async () => {
      await service.create({ subject: 'Test', description: 'desc' } as any, 'user-1');
      expect(auditLogs.log).toHaveBeenCalledWith('ticket_created', 'Ticket', mockTicket.id, 'user-1', { subject: 'Test' });
    });
  });

  describe('update', () => {
    it('stamps resolvedAt when status moves to RESOLVED', async () => {
      await service.update('ticket-1', { status: 'RESOLVED' } as any, 'user-1');
      const updateCall = prisma.ticket.update.mock.calls[0][0];
      expect(updateCall.data.resolvedAt).toBeInstanceOf(Date);
    });

    it('does not stamp resolvedAt for other status changes', async () => {
      await service.update('ticket-1', { status: 'IN_PROGRESS' } as any, 'user-1');
      const updateCall = prisma.ticket.update.mock.calls[0][0];
      expect(updateCall.data.resolvedAt).toBeUndefined();
    });

    it('throws NotFoundException when the ticket does not exist', async () => {
      prisma.ticket.findUnique.mockResolvedValue(null);
      await expect(service.update('missing', { status: 'OPEN' } as any, 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('emits a ticket:updated realtime event', async () => {
      await service.update('ticket-1', { priority: 'HIGH' } as any, 'user-1');
      expect(realtime.emit).toHaveBeenCalledWith('ticket:updated', expect.any(Object));
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException for a missing ticket', async () => {
      prisma.ticket.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('addComment', () => {
    it('validates the ticket exists before adding a comment', async () => {
      prisma.ticket.findUnique.mockResolvedValue(null);
      await expect(service.addComment('missing', { content: 'hi' } as any, 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('defaults isInternal to true when not specified', async () => {
      await service.addComment('ticket-1', { content: 'internal note' } as any, 'user-1');
      expect(prisma.ticketComment.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isInternal: true }) }),
      );
    });
  });

  describe('checkSlaBreaches', () => {
    it('finds overdue, unresolved tickets and logs a breach for each', async () => {
      prisma.ticket.findMany.mockResolvedValue([{ id: 't1', subject: 'Overdue', assignedAgentId: 'agent-1', assignedAgent: { notificationPrefs: [{ slaBreach: true }] } }]);
      const result = await service.checkSlaBreaches();
      expect(result.breached).toBe(1);
      expect(auditLogs.log).toHaveBeenCalledWith('sla_breach', 'Ticket', 't1', 'agent-1', { subject: 'Overdue' });
      expect(realtime.emit).toHaveBeenCalledWith('sla:breach', { ticketId: 't1', subject: 'Overdue' });
    });

    it('does not emit realtime event when agent has SLA breach notifications disabled', async () => {
      prisma.ticket.findMany.mockResolvedValue([{ id: 't1', subject: 'Overdue', assignedAgentId: 'agent-1', assignedAgent: { notificationPrefs: [{ slaBreach: false }] } }]);
      await service.checkSlaBreaches();
      expect(realtime.emit).not.toHaveBeenCalledWith('sla:breach', expect.anything());
    });

    it('excludes RESOLVED and CLOSED tickets from the overdue query', async () => {
      await service.checkSlaBreaches();
      expect(prisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: { notIn: ['RESOLVED', 'CLOSED'] } }) }),
      );
    });

    it('only queries tickets that have not already been notified, and marks them notified', async () => {
      prisma.ticket.findMany.mockResolvedValue([{ id: 't1', subject: 'Overdue', assignedAgentId: 'agent-1', assignedAgent: { notificationPrefs: [] } }]);
      await service.checkSlaBreaches();
      expect(prisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ slaBreachNotifiedAt: null }) }),
      );
      expect(prisma.ticket.update).toHaveBeenCalledWith({ where: { id: 't1' }, data: { slaBreachNotifiedAt: expect.any(Date) } });
    });
  });
});

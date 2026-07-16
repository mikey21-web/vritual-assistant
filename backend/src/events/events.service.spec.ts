import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from './events.service';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

describe('EventsService', () => {
  let service: EventsService;
  let prisma: any;

  const mockEvent = {
    id: 'event-1',
    type: 'lead_created',
    source: 'system',
    entityType: 'Lead',
    entityId: 'lead-1',
    leadId: 'lead-1',
    contactId: 'contact-1',
    campaignId: null,
    payload: { source: 'FORM' },
    metadata: null,
    correlationId: 'corr-1',
    idempotencyKey: 'idem-1',
    status: 'processed',
    processedAt: new Date('2025-01-01T00:00:00Z'),
    createdById: null,
    createdAt: new Date('2025-01-01T00:00:00Z'),
  };

  beforeEach(async () => {
    prisma = {
      systemEvent: {
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([mockEvent, { ...mockEvent, id: 'event-2', type: 'lead_scored' }]),
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ id: 'event-new', ...data, createdAt: new Date() }),
        ),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: PrismaService, useValue: prisma },
        { provide: RealtimeGateway, useValue: { emit: jest.fn(), emitToTenant: jest.fn(), emitToUser: jest.fn(), emitToRoom: jest.fn() } },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
  });

  describe('emit', () => {
    it('should create a new event', async () => {
      const event = await service.emit({
        type: 'lead_created',
        entityType: 'Lead',
        entityId: 'lead-1',
        leadId: 'lead-1',
        payload: { source: 'FORM' },
      });
      expect(event.type).toBe('lead_created');
      expect(event.source).toBe('system');
      expect(event.status).toBe('processed');
      expect(event.processedAt).toBeDefined();
    });

    it('should return existing event for duplicate idempotencyKey', async () => {
      prisma.systemEvent.findUnique.mockResolvedValue(mockEvent);
      const event = await service.emit({
        type: 'lead_created',
        idempotencyKey: 'idem-1',
      });
      expect(event.id).toBe('event-1');
      expect(prisma.systemEvent.create).not.toHaveBeenCalled();
    });

    it('should generate a random idempotencyKey when none provided', async () => {
      const crypto = require('crypto');
      const spy = jest.spyOn(crypto, 'randomUUID').mockReturnValue('auto-gen-key');
      const event = await service.emit({ type: 'lead_created' });
      expect(event.idempotencyKey).toBe('auto-gen-key');
      spy.mockRestore();
    });

    it('should default source to "system" when not provided', async () => {
      const event = await service.emit({ type: 'lead_created' });
      expect(event.source).toBe('system');
    });

    it('should default payload to empty object when not provided', async () => {
      await service.emit({ type: 'lead_created' });
      expect(prisma.systemEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            payload: {},
          }),
        }),
      );
    });

    it('should not query for existing event when idempotencyKey is not provided', async () => {
      await service.emit({ type: 'lead_created' });
      expect(prisma.systemEvent.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('findByLead', () => {
    it('should return events for a lead ordered by createdAt desc', async () => {
      const events = await service.findByLead('lead-1');
      expect(events).toHaveLength(2);
      expect(prisma.systemEvent.findMany).toHaveBeenCalledWith({
        where: { leadId: 'lead-1' },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
    });

    it('should return empty array when lead has no events', async () => {
      prisma.systemEvent.findMany.mockResolvedValue([]);
      const events = await service.findByLead('lead-none');
      expect(events).toHaveLength(0);
    });
  });

  describe('findByEntity', () => {
    it('should return events for an entity ordered by createdAt desc', async () => {
      const events = await service.findByEntity('Lead', 'lead-1');
      expect(events).toHaveLength(2);
      expect(prisma.systemEvent.findMany).toHaveBeenCalledWith({
        where: { entityType: 'Lead', entityId: 'lead-1' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });

    it('should return empty array when entity has no events', async () => {
      prisma.systemEvent.findMany.mockResolvedValue([]);
      const events = await service.findByEntity('Campaign', 'nonexistent');
      expect(events).toHaveLength(0);
    });
  });

  describe('findByType', () => {
    it('should return events by type with default limit of 50', async () => {
      const events = await service.findByType('lead_created');
      expect(events).toHaveLength(2);
      expect(prisma.systemEvent.findMany).toHaveBeenCalledWith({
        where: { type: 'lead_created' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });

    it('should respect custom limit parameter', async () => {
      await service.findByType('lead_created', 10);
      expect(prisma.systemEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 }),
      );
    });

    it('should return empty array when type has no events', async () => {
      prisma.systemEvent.findMany.mockResolvedValue([]);
      const events = await service.findByType('nonexistent_type');
      expect(events).toHaveLength(0);
    });
  });
});

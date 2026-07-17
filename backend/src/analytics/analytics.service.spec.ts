import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      lead: {
        count: jest.fn().mockImplementation((args?: any) => {
          if (!args) return Promise.resolve(200);
          const where = args.where || {};
          if (where.segment === 'HOT') return Promise.resolve(40);
          if (where.segment === 'WARM') return Promise.resolve(60);
          if (where.segment === 'COLD') return Promise.resolve(100);
          if (where.status === 'CONVERTED') return Promise.resolve(30);
          if (where.status === 'LOST') return Promise.resolve(20);
          return Promise.resolve(0);
        }),
        findMany: jest.fn().mockResolvedValue([]),
        groupBy: jest.fn().mockResolvedValue([
          { source: 'WEBSITE', _count: 80 },
          { source: 'REFERRAL', _count: 50 },
          { source: 'SOCIAL', _count: 40 },
          { source: 'WHATSAPP', _count: 30 },
        ]),
      },
      campaign: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'camp-1', name: 'Summer Sale', active: true, _count: { leads: 25 } },
          { id: 'camp-2', name: 'Winter Promo', active: false, _count: { leads: 10 } },
          { id: 'camp-3', name: 'Spring Launch', active: true, _count: { leads: 50 } },
        ]),
      },
      conversion: {
        groupBy: jest.fn().mockResolvedValue([
          { destination: 'CRM', status: 'completed', _count: 15 },
          { destination: 'CRM', status: 'failed', _count: 2 },
          { destination: 'BOOKING', status: 'completed', _count: 8 },
          { destination: 'EMAIL', status: 'completed', _count: 5 },
        ]),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'agent-1',
            name: 'Alice',
            role: 'SALES_AGENT',
            assignedLeads: [
              { id: 'lead-1', status: 'CONVERTED' },
              { id: 'lead-2', status: 'NEW' },
              { id: 'lead-3', status: 'CONVERTED' },
            ],
          },
          {
            id: 'agent-2',
            name: 'Bob',
            role: 'MANAGER',
            assignedLeads: [
              { id: 'lead-4', status: 'NEW' },
              { id: 'lead-5', status: 'LOST' },
            ],
          },
          {
            id: 'agent-3',
            name: 'Charlie',
            role: 'SALES_AGENT',
            assignedLeads: [],
          },
        ]),
      },
      booking: {
        count: jest.fn().mockResolvedValue(3),
        findMany: jest.fn().mockResolvedValue([]),
      },
      paymentSchedule: {
        count: jest.fn().mockResolvedValue(2),
        findMany: jest.fn().mockResolvedValue([]),
      },
      project: {
        count: jest.fn().mockResolvedValue(4),
      },
      unit: {
        groupBy: jest.fn().mockResolvedValue([
          { status: 'AVAILABLE', _count: 45, _sum: { price: 450000000 } },
          { status: 'BOOKED', _count: 10, _sum: { price: 100000000 } },
        ]),
      },
      channelPartner: {
        count: jest.fn().mockResolvedValue(6),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  // ── overview ─────────────────────────────────────────────────────

  it('should return aggregated lead overview with conversion rate', async () => {
    const result = await service.overview();
    expect(result.total).toBe(200);
    expect(result.hot).toBe(40);
    expect(result.warm).toBe(60);
    expect(result.cold).toBe(100);
    expect(result.converted).toBe(30);
    expect(result.lost).toBe(20);
    expect(result.conversionRate).toBe('15.0'); // 30/200 * 100
  });

  it('should return zero conversion rate when there are no leads', async () => {
    prisma.lead.count.mockResolvedValue(0);
    const result = await service.overview();
    expect(result.total).toBe(0);
    expect(result.conversionRate).toBe(0);
  });

  it('should return zeros for all segments when no leads exist', async () => {
    prisma.lead.count.mockResolvedValue(0);
    const result = await service.overview();
    expect(result.hot).toBe(0);
    expect(result.warm).toBe(0);
    expect(result.cold).toBe(0);
    expect(result.converted).toBe(0);
    expect(result.lost).toBe(0);
  });

  it('should handle high conversion rate correctly', async () => {
    prisma.lead.count = jest.fn().mockImplementation((args?: any) => {
      if (!args) return Promise.resolve(10);
      if (args?.where?.segment === 'HOT') return Promise.resolve(8);
      if (args?.where?.segment === 'WARM') return Promise.resolve(1);
      if (args?.where?.segment === 'COLD') return Promise.resolve(1);
      if (args?.where?.status === 'CONVERTED') return Promise.resolve(9);
      if (args?.where?.status === 'LOST') return Promise.resolve(0);
      return Promise.resolve(0);
    });
    const result = await service.overview();
    expect(result.total).toBe(10);
    expect(result.converted).toBe(9);
    expect(result.conversionRate).toBe('90.0');
  });

  it('should handle zero conversion rate when no leads converted', async () => {
    prisma.lead.count = jest.fn().mockImplementation((args?: any) => {
      if (!args) return Promise.resolve(50);
      if (args?.where?.segment === 'HOT') return Promise.resolve(10);
      if (args?.where?.segment === 'WARM') return Promise.resolve(20);
      if (args?.where?.segment === 'COLD') return Promise.resolve(20);
      if (args?.where?.status === 'CONVERTED') return Promise.resolve(0);
      if (args?.where?.status === 'LOST') return Promise.resolve(0);
      return Promise.resolve(0);
    });
    const result = await service.overview();
    expect(result.total).toBe(50);
    expect(result.converted).toBe(0);
    expect(result.conversionRate).toBe('0.0');
  });

  // ── sources ──────────────────────────────────────────────────────

  it('should return lead counts grouped by source', async () => {
    const result = await service.sources();
    expect(result).toHaveLength(4);
    expect(result[0]).toEqual({ source: 'WEBSITE', count: 80 });
    expect(result[1]).toEqual({ source: 'REFERRAL', count: 50 });
    expect(result[2]).toEqual({ source: 'SOCIAL', count: 40 });
    expect(result[3]).toEqual({ source: 'WHATSAPP', count: 30 });
    expect(prisma.lead.groupBy).toHaveBeenCalledWith({ by: ['source'], _count: true });
  });

  it('should return empty array when no leads exist for sources', async () => {
    prisma.lead.groupBy.mockResolvedValue([]);
    const result = await service.sources();
    expect(result).toEqual([]);
  });

  it('should handle single source correctly', async () => {
    prisma.lead.groupBy.mockResolvedValue([{ source: 'WEBSITE', _count: 1 }]);
    const result = await service.sources();
    expect(result).toHaveLength(1);
    expect(result[0].source).toBe('WEBSITE');
    expect(result[0].count).toBe(1);
  });

  // ── campaigns ────────────────────────────────────────────────────

  it('should return campaigns with lead counts', async () => {
    const result = await service.campaigns();
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ id: 'camp-1', name: 'Summer Sale', active: true, leadCount: 25 });
    expect(result[1]).toEqual({ id: 'camp-2', name: 'Winter Promo', active: false, leadCount: 10 });
    expect(result[2]).toEqual({ id: 'camp-3', name: 'Spring Launch', active: true, leadCount: 50 });
    expect(prisma.campaign.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ include: { _count: { select: { leads: true } } } }),
    );
  });

  it('should return empty array when no campaigns exist', async () => {
    prisma.campaign.findMany.mockResolvedValue([]);
    const result = await service.campaigns();
    expect(result).toEqual([]);
  });

  it('should handle campaign with zero leads', async () => {
    prisma.campaign.findMany.mockResolvedValue([
      { id: 'camp-empty', name: 'Empty Campaign', active: true, _count: { leads: 0 } },
    ]);
    const result = await service.campaigns();
    expect(result[0].leadCount).toBe(0);
  });

  // ── conversions ──────────────────────────────────────────────────

  it('should return conversions grouped by destination and status', async () => {
    const result = await service.conversions();
    expect(result).toHaveLength(4);
    expect(result[0]).toEqual({ destination: 'CRM', status: 'completed', _count: 15 });
    expect(result[1]).toEqual({ destination: 'CRM', status: 'failed', _count: 2 });
    expect(prisma.conversion.groupBy).toHaveBeenCalledWith({ by: ['destination', 'status'], _count: true });
  });

  it('should return empty array when no conversions exist', async () => {
    prisma.conversion.groupBy.mockResolvedValue([]);
    const result = await service.conversions();
    expect(result).toEqual([]);
  });

  // ── agents ───────────────────────────────────────────────────────

  it('should return agent performance data', async () => {
    const result = await service.agents();
    expect(result).toHaveLength(3);
    // Alice: 3 assigned, 2 converted
    expect(result[0]).toEqual({ id: 'agent-1', name: 'Alice', role: 'SALES_AGENT', assignedLeads: 3, converted: 2 });
    // Bob: 2 assigned, 0 converted
    expect(result[1]).toEqual({ id: 'agent-2', name: 'Bob', role: 'MANAGER', assignedLeads: 2, converted: 0 });
    // Charlie: 0 assigned, 0 converted
    expect(result[2]).toEqual({ id: 'agent-3', name: 'Charlie', role: 'SALES_AGENT', assignedLeads: 0, converted: 0 });
  });

  it('should filter users by sales roles', async () => {
    await service.agents();
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { role: { in: ['SALES_AGENT', 'MANAGER', 'OWNER'] } },
      }),
    );
  });

  it('should return empty array when no sales agents exist', async () => {
    prisma.user.findMany.mockResolvedValue([]);
    const result = await service.agents();
    expect(result).toEqual([]);
  });

  // ── builder command ──────────────────────────────────────────────

  it('should return a builder-focused command payload', async () => {
    prisma.lead.count = jest.fn().mockImplementation((args?: any) => {
      const where = args?.where || {};
      if (where.segment === 'HOT') return Promise.resolve(12);
      if (where.assignedAgentId === null) return Promise.resolve(5);
      if (where.createdAt) return Promise.resolve(7);
      return Promise.resolve(38);
    });
    prisma.lead.groupBy.mockResolvedValue([
      { source: 'MAGICBRICKS', _count: 18 },
      { source: 'NINETY_NINE_ACRES', _count: 11 },
    ]);
    prisma.lead.findMany.mockResolvedValue([
      {
        id: 'lead-1',
        source: 'MAGICBRICKS',
        status: 'NEW',
        segment: 'HOT',
        score: 91,
        budget: '80L-1Cr',
        interest: '3BHK',
        createdAt: new Date('2026-07-17T08:00:00Z'),
        contact: { name: 'Ravi Kumar', phone: '9999999999', whatsapp: null, location: 'Pune' },
        assignedAgent: null,
        channelPartner: { name: 'Prime Realty', company: null },
      },
    ]);
    prisma.booking.findMany.mockResolvedValue([
      {
        id: 'booking-1',
        title: 'Site visit',
        startTime: new Date('2026-07-18T05:00:00Z'),
        status: 'CONFIRMED',
        lead: { contact: { name: 'Ravi Kumar', phone: '9999999999' }, assignedAgent: { name: 'Asha' } },
        unit: { unitNumber: 'A-1201', tower: { name: 'Tower A' }, project: { name: 'Skyline', location: 'Hinjewadi' } },
      },
    ]);
    prisma.paymentSchedule.findMany.mockResolvedValue([
      {
        id: 'pay-1',
        label: 'Booking amount',
        amount: 200000,
        currency: 'INR',
        dueDate: new Date('2026-07-15T00:00:00Z'),
        status: 'OVERDUE',
        lead: { contact: { name: 'Ravi Kumar', phone: '9999999999' } },
        booking: { unit: { project: { name: 'Skyline' } } },
      },
    ]);
    prisma.channelPartner.findMany.mockResolvedValue([
      { id: 'cp-1', name: 'Prime Realty', company: null, phone: '8888888888', reraId: 'RERA-1', commissionRate: 2, _count: { leads: 9 } },
    ]);

    const result = await service.builderCommand();

    expect(result.kpis.activeLeads).toBe(38);
    expect(result.kpis.hotLeads).toBe(12);
    expect(result.kpis.unassignedLeads).toBe(5);
    expect(result.sourceBreakdown[0]).toEqual({ source: 'MAGICBRICKS', leads: 18 });
    expect(result.inventory.AVAILABLE).toEqual({ count: 45, value: 450000000 });
    expect(result.recentLeads[0].buyer).toBe('Ravi Kumar');
    expect(result.upcomingVisits[0].project).toBe('Skyline');
    expect(result.collectionQueue[0].amount).toBe(200000);
    expect(result.topPartners[0].leadCount).toBe(9);
    expect(result.nextActions.length).toBeGreaterThan(0);
  });

  // ── End-to-End verification ──────────────────────────────────────

  it('should handle multiple service calls independently', async () => {
    const overview = await service.overview();
    const sources = await service.sources();
    const campaigns = await service.campaigns();

    expect(overview.total).toBe(200);
    expect(sources).toHaveLength(4);
    expect(campaigns).toHaveLength(3);
  });

  it('should throw when prisma fails', async () => {
    prisma.lead.count.mockRejectedValue(new Error('Database connection lost'));
    await expect(service.overview()).rejects.toThrow('Database connection lost');
  });
});

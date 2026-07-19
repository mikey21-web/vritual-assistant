import { NotFoundException } from '@nestjs/common';
import { WorkforceService } from './workforce.service';

describe('WorkforceService', () => {
  const prisma = {
    shift: { create: jest.fn(), findMany: jest.fn() },
    agentAvailability: { upsert: jest.fn(), findMany: jest.fn() },
    callLog: { findFirst: jest.fn(), count: jest.fn() },
    callQualityReview: { create: jest.fn(), aggregate: jest.fn() },
    siteVisit: { findFirst: jest.fn() },
    visitAttendance: { create: jest.fn() },
    lead: { groupBy: jest.fn() },
  } as any;
  const service = new WorkforceService(prisma);

  beforeEach(() => jest.clearAllMocks());

  it('submitQualityReview refuses when the call log does not belong to the tenant', async () => {
    prisma.callLog.findFirst.mockResolvedValue(null);
    await expect(service.submitQualityReview('t1', { callLogId: 'c1', score: 80 })).rejects.toThrow(NotFoundException);
  });

  it('recordVisitAttendance refuses an unknown site visit', async () => {
    prisma.siteVisit.findFirst.mockResolvedValue(null);
    await expect(service.recordVisitAttendance('t1', 'sv1', {})).rejects.toThrow(NotFoundException);
  });

  it('managerDashboard aggregates availability counts and queue load', async () => {
    prisma.agentAvailability.findMany.mockResolvedValue([
      { userId: 'u1', status: 'AVAILABLE', since: new Date(), user: { name: 'A' } },
      { userId: 'u2', status: 'ON_CALL', since: new Date(), user: { name: 'B' } },
      { userId: 'u3', status: 'AVAILABLE', since: new Date(), user: { name: 'C' } },
    ]);
    prisma.lead.groupBy.mockResolvedValue([{ assignedAgentId: 'u1', _count: { _all: 4 } }]);
    prisma.callLog.count.mockResolvedValue(2);
    prisma.callQualityReview.aggregate.mockResolvedValue({ _avg: { score: 85 }, _count: { _all: 10 } });

    const dashboard = await service.managerDashboard('t1');

    expect(dashboard.availabilityByStatus).toEqual({ AVAILABLE: 2, ON_CALL: 1 });
    expect(dashboard.queueLoadByAgent).toEqual([{ agentId: 'u1', openLeads: 4 }]);
    expect(dashboard.unansweredCalls).toBe(2);
    expect(dashboard.avgQualityScoreLast30d).toBe(85);
  });
});

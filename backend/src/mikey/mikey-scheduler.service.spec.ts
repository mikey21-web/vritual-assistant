import { MikeySchedulerService } from './mikey-scheduler.service';

/**
 * Reliability-only checks for the always-on loop: a broken sub-check can't
 * take the whole scan down, two overlapping ticks can't run concurrently,
 * and failures are visible via getHealth() instead of only living in logs.
 */
describe('MikeySchedulerService reliability', () => {
  let prisma: any;
  let reflexion: any;
  let scheduler: MikeySchedulerService;

  beforeEach(() => {
    prisma = {
      lead: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0), groupBy: jest.fn().mockResolvedValue([]) },
      task: { findMany: jest.fn().mockResolvedValue([]) },
      tenant: { findMany: jest.fn().mockResolvedValue([]) },
      booking: { findMany: jest.fn().mockResolvedValue([]) },
      campaign: { findMany: jest.fn().mockResolvedValue([]) },
      callLog: { findMany: jest.fn().mockResolvedValue([]) },
      failureRecord: { findMany: jest.fn().mockResolvedValue([]) },
      user: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const noop = { scan: jest.fn().mockResolvedValue([]), reconcile: jest.fn().mockResolvedValue(undefined) };
    const events = { emit: jest.fn().mockResolvedValue(undefined) };
    const metaCycle = { recordDecision: jest.fn().mockResolvedValue(undefined) };
    const nicheScanner = { scanAll: jest.fn().mockResolvedValue([]) };
    const nicheAction = { execute: jest.fn().mockResolvedValue({ executed: false }) };
    reflexion = { reflectOnOutcome: jest.fn().mockResolvedValue(null) };
    const bookingLifecycle = { scanNoShows: jest.fn().mockResolvedValue(undefined), scanOverduePayments: jest.fn().mockResolvedValue(undefined) };
    const siteVisits = { scanNoShows: jest.fn().mockResolvedValue(undefined) };
    const unitHolds = { scanExpiredHolds: jest.fn().mockResolvedValue(undefined) };
    const salienceEngine = { route: jest.fn().mockResolvedValue({ acted: false }) };
    const mikey = { generateProactiveTasksForAllLeads: jest.fn().mockResolvedValue(0) };
    const notifications = { create: jest.fn().mockResolvedValue(undefined) };

    const metrics = { record: jest.fn(), increment: jest.fn(), incrementCounter: jest.fn() };

    scheduler = new MikeySchedulerService(
      prisma, events as any, noop as any, noop as any, metaCycle as any,
      nicheScanner as any, nicheAction as any, reflexion as any, {} as any,
      bookingLifecycle as any, siteVisits as any, unitHolds as any,
      { reconcile: jest.fn().mockResolvedValue(undefined) } as any,
      {} as any, salienceEngine as any, mikey as any, notifications as any,
      metrics as any,
    );
  });

  it('reports healthy with no scans run yet', () => {
    expect(scheduler.getHealth()).toMatchObject({ scanning: false, totalScans: 0, healthy: true });
  });

  it('a throwing sub-check does not crash the scan or block other checks', async () => {
    prisma.lead.findMany.mockRejectedValueOnce(new Error('DB blip'));
    await (scheduler as any).scan();

    const health = scheduler.getHealth();
    expect(health.scanning).toBe(false);
    expect(health.totalScans).toBe(1);
    // the outer try/catch never fired because runCheck() swallowed the failure
    expect(health.lastScanError).toBeNull();
  });

  it('skips a scan that starts while one is already in progress', async () => {
    let resolveFirst: () => void;
    prisma.lead.findMany.mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = () => resolve([]); }));

    const first = (scheduler as any).scan();
    const second = (scheduler as any).scan(); // should skip immediately, not queue

    resolveFirst!();
    await Promise.all([first, second]);

    expect(scheduler.getHealth().totalScans).toBe(1);
  });

  it('runs reflexion on recently confirmed/cancelled bookings and deactivated campaigns, not just leads', async () => {
    prisma.booking.findMany
      .mockResolvedValueOnce([{ id: 'b1', tenantId: 't1' }]) // confirmed
      .mockResolvedValueOnce([{ id: 'b2', tenantId: 't1' }]); // cancelled
    prisma.campaign.findMany.mockResolvedValueOnce([{ id: 'c1', tenantId: 't1' }]);

    await (scheduler as any).runReflexionOnRecentOutcomes();

    expect(reflexion.reflectOnOutcome).toHaveBeenCalledWith('t1', 'booking_outcome', 'b1');
    expect(reflexion.reflectOnOutcome).toHaveBeenCalledWith('t1', 'booking_outcome', 'b2');
    expect(reflexion.reflectOnOutcome).toHaveBeenCalledWith('t1', 'campaign_result', 'c1');
  });

  it('does not let a failed reflection on one booking stop the others', async () => {
    prisma.booking.findMany
      .mockResolvedValueOnce([{ id: 'b1', tenantId: 't1' }, { id: 'b2', tenantId: 't1' }])
      .mockResolvedValueOnce([]);
    reflexion.reflectOnOutcome.mockRejectedValueOnce(new Error('LLM timeout'));

    await (scheduler as any).runReflexionOnRecentOutcomes();

    expect(reflexion.reflectOnOutcome).toHaveBeenCalledWith('t1', 'booking_outcome', 'b1');
    expect(reflexion.reflectOnOutcome).toHaveBeenCalledWith('t1', 'booking_outcome', 'b2');
  });
});


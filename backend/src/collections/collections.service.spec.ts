import { Test, TestingModule } from '@nestjs/testing';
import { CollectionsService } from './collections.service';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ForbiddenException } from '@nestjs/common';

describe('CollectionsService', () => {
  let service: CollectionsService;
  let prisma: any;

  const tenantId = 'tenant-1';
  const receipt = { id: 'receipt-1', tenantId, leadId: 'lead-1', bookingId: null, amountPaise: BigInt(100000), mode: 'UPI', status: 'PENDING_RECONCILIATION' };

  beforeEach(async () => {
    prisma = {
      lead: { findFirst: jest.fn().mockResolvedValue({ id: 'lead-1', tenantId }) },
      paymentReceipt: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...receipt, ...data, allocations: [] })),
        findFirst: jest.fn().mockResolvedValue(receipt),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...receipt, ...data })),
        findMany: jest.fn().mockResolvedValue([receipt]),
        count: jest.fn().mockResolvedValue(1),
      },
      ledgerEntry: {
        create: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([
          { id: 'le-1', type: 'DEBIT', amountPaise: BigInt(500000), createdAt: new Date('2026-01-01') },
          { id: 'le-2', type: 'PAYMENT', amountPaise: BigInt(200000), createdAt: new Date('2026-01-02') },
        ]),
      },
      $transaction: jest.fn().mockImplementation((ops: any[]) => Promise.all(ops)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollectionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: TimelineService, useValue: { add: jest.fn() } },
        { provide: AuditLogsService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get(CollectionsService);
  });

  it('records a receipt as PENDING_RECONCILIATION, never CONFIRMED directly', async () => {
    const r = await service.recordReceipt(tenantId, { leadId: 'lead-1', amountPaise: 100000, mode: 'UPI' });
    expect(r.status).toBe('PENDING_RECONCILIATION');
  });

  it('confirming writes a PAYMENT ledger entry', async () => {
    await service.confirm(tenantId, 'receipt-1', 'agent-1');
    expect(prisma.ledgerEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'PAYMENT', amountPaise: BigInt(100000) }) }),
    );
  });

  it('refuses to confirm a receipt twice', async () => {
    prisma.paymentReceipt.findFirst.mockResolvedValue({ ...receipt, status: 'CONFIRMED' });
    await expect(service.confirm(tenantId, 'receipt-1', 'agent-1')).rejects.toThrow(ForbiddenException);
  });

  it('refuses to reverse a receipt that was never confirmed', async () => {
    await expect(service.reverse(tenantId, 'receipt-1', 'duplicate entry', 'manager-1')).rejects.toThrow(ForbiddenException);
  });

  it('reversing a confirmed receipt writes a REVERSAL ledger entry', async () => {
    prisma.paymentReceipt.findFirst.mockResolvedValue({ ...receipt, status: 'CONFIRMED' });
    await service.reverse(tenantId, 'receipt-1', 'duplicate entry', 'manager-1');
    expect(prisma.ledgerEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'REVERSAL' }) }),
    );
  });

  it('computes a running balance from ledger entries: debit increases, payment decreases', async () => {
    const { balancePaise } = await service.ledger(tenantId, 'lead-1');
    expect(balancePaise).toBe('300000');
  });
});

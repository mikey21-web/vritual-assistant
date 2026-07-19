import { Test, TestingModule } from '@nestjs/testing';
import { InterestService } from './interest.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ForbiddenException } from '@nestjs/common';

describe('InterestService.computeOverdueCharge', () => {
  let service: InterestService;
  let prisma: any;

  const tenantId = 't1';
  const tenDaysAgo = new Date(Date.now() - 10 * 86400000);

  beforeEach(async () => {
    prisma = {
      paymentSchedule: { findFirst: jest.fn().mockResolvedValue({ id: 'ps-1', tenantId, leadId: 'lead-1', bookingId: 'b-1', status: 'OVERDUE', dueDate: tenDaysAgo, amount: 1000000 }) },
      interestPolicy: { findFirst: jest.fn().mockResolvedValue({ id: 'pol-1', tenantId, name: 'Standard', ratePercentPerMonth: 12, graceDays: 5, active: true }) },
      ledgerEntry: { create: jest.fn().mockResolvedValue({}) },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [InterestService, { provide: PrismaService, useValue: prisma }, { provide: AuditLogsService, useValue: { log: jest.fn() } }],
    }).compile();
    service = module.get(InterestService);
  });

  it('charges nothing within the grace period', async () => {
    prisma.paymentSchedule.findFirst.mockResolvedValue({ id: 'ps-1', tenantId, leadId: 'l', bookingId: 'b', status: 'OVERDUE', dueDate: new Date(Date.now() - 2 * 86400000), amount: 1000000 });
    const r = await service.computeOverdueCharge(tenantId, 'ps-1', 'pol-1');
    expect(r.chargedPaise).toBe('0');
    expect(prisma.ledgerEntry.create).not.toHaveBeenCalled();
  });

  it('computes proration correctly: 10L rupees, 12%/mo, 5 overdue days (10d - 5 grace)', async () => {
    // amountPaise = 100,000,000; rate/mo=12% -> 12,000,000/mo; *5/30 = 2,000,000
    const r = await service.computeOverdueCharge(tenantId, 'ps-1', 'pol-1');
    expect(r.overdueDays).toBe(5);
    expect(r.chargedPaise).toBe('2000000');
    expect(prisma.ledgerEntry.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ type: 'DEBIT', amountPaise: BigInt(2000000) }) }));
  });

  it('refuses to compute for a schedule that is not OVERDUE', async () => {
    prisma.paymentSchedule.findFirst.mockResolvedValue({ id: 'ps-1', tenantId, status: 'PENDING', dueDate: tenDaysAgo, amount: 1000 });
    await expect(service.computeOverdueCharge(tenantId, 'ps-1', 'pol-1')).rejects.toThrow(ForbiddenException);
  });
});

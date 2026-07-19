import { Test, TestingModule } from '@nestjs/testing';
import { PostSalesService } from './post-sales.service';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('PostSalesService.advance', () => {
  let service: PostSalesService;
  let prisma: any;

  const tenantId = 't1';
  const booking = { id: 'b1', tenantId, leadId: 'l1', status: 'CONFIRMED', postSalesStage: 'BOOKING_CONFIRMED' };

  beforeEach(async () => {
    prisma = {
      booking: { findFirst: jest.fn().mockResolvedValue(booking), update: jest.fn().mockResolvedValue(booking) },
      buyerDocument: { findMany: jest.fn().mockResolvedValue([{ type: 'PAN', status: 'VERIFIED' }, { type: 'ADDRESS_PROOF', status: 'WAIVED' }]) },
      generatedDocument: { findFirst: jest.fn().mockResolvedValue({ snapshot: { documentType: 'AGREEMENT' } }) },
      paymentSchedule: { count: jest.fn().mockResolvedValue(0) },
      possessionCase: { findUnique: jest.fn().mockResolvedValue(null) },
      postSalesTransition: { create: jest.fn().mockResolvedValue({}), findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn().mockImplementation((ops: any[]) => Promise.all(ops)),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [PostSalesService, { provide: PrismaService, useValue: prisma }, { provide: TimelineService, useValue: { add: jest.fn() } }, { provide: AuditLogsService, useValue: { log: jest.fn() } }],
    }).compile();
    service = module.get(PostSalesService);
  });

  it('advances one stage forward when preconditions pass', async () => {
    await service.advance(tenantId, 'b1', 'KYC_IN_PROGRESS' as any, 'u1');
    expect(prisma.booking.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ postSalesStage: 'KYC_IN_PROGRESS' }) }));
  });

  it('refuses to skip a stage', async () => {
    await expect(service.advance(tenantId, 'b1', 'AGREEMENT_IN_PROGRESS' as any, 'u1')).rejects.toThrow(BadRequestException);
  });

  it('refuses ALLOTMENT_ISSUED when required KYC docs are not verified', async () => {
    prisma.booking.findFirst.mockResolvedValue({ ...booking, postSalesStage: 'KYC_IN_PROGRESS' });
    prisma.buyerDocument.findMany.mockResolvedValue([{ type: 'PAN', status: 'UPLOADED' }]);
    await expect(service.advance(tenantId, 'b1', 'ALLOTMENT_ISSUED' as any, 'u1')).rejects.toThrow(ForbiddenException);
  });

  it('refuses to run the lifecycle on a booking that is not CONFIRMED', async () => {
    prisma.booking.findFirst.mockResolvedValue({ ...booking, status: 'PENDING' });
    await expect(service.advance(tenantId, 'b1', 'KYC_IN_PROGRESS' as any, 'u1')).rejects.toThrow(ForbiddenException);
  });
});

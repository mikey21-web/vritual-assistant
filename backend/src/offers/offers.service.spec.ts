import { Test, TestingModule } from '@nestjs/testing';
import { OffersService } from './offers.service';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ForbiddenException } from '@nestjs/common';
import { OfferDecision } from '@prisma/client';

describe('OffersService', () => {
  let service: OffersService;
  let prisma: any;

  const tenantId = 'tenant-1';
  const costSheet = { id: 'sheet-1', tenantId, leadId: 'lead-1', totalPaise: BigInt(500000000) };
  const pendingOffer = { id: 'offer-1', tenantId, leadId: 'lead-1', costSheetId: 'sheet-1', status: 'PENDING', expiresAt: null };

  beforeEach(async () => {
    prisma = {
      costSheet: { findFirst: jest.fn().mockResolvedValue(costSheet) },
      offer: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'offer-1', status: 'PENDING', ...data })),
        findFirst: jest.fn().mockResolvedValue(pendingOffer),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...pendingOffer, ...data })),
        findMany: jest.fn().mockResolvedValue([pendingOffer]),
        count: jest.fn().mockResolvedValue(1),
      },
      offerApproval: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn().mockImplementation((ops: any[]) => Promise.all(ops)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OffersService,
        { provide: PrismaService, useValue: prisma },
        { provide: TimelineService, useValue: { add: jest.fn() } },
        { provide: AuditLogsService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get(OffersService);
  });

  it('computes the proposed value from a flat discount', async () => {
    const offer = await service.request(tenantId, { costSheetId: 'sheet-1', discountPaise: 10000000, requestedById: 'agent-1' });
    expect(offer.proposedValuePaise).toBe('490000000');
  });

  it('computes the proposed value from a percentage discount', async () => {
    const offer = await service.request(tenantId, { costSheetId: 'sheet-1', discountPercent: 2, requestedById: 'agent-1' });
    expect(offer.proposedValuePaise).toBe('490000000');
  });

  it('refuses to decide an offer that is not PENDING', async () => {
    prisma.offer.findFirst.mockResolvedValue({ ...pendingOffer, status: 'APPROVED' });
    await expect(service.decide(tenantId, 'offer-1', OfferDecision.APPROVED, undefined, 'manager-1')).rejects.toThrow(ForbiddenException);
  });

  it('records an OfferApproval row alongside the status change', async () => {
    await service.decide(tenantId, 'offer-1', OfferDecision.APPROVED, 'looks fine', 'manager-1');
    expect(prisma.offerApproval.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ offerId: 'offer-1', decision: 'APPROVED', reason: 'looks fine' }) }),
    );
  });

  it('a rejected offer cannot later be approved', async () => {
    prisma.offer.findFirst.mockResolvedValue({ ...pendingOffer, status: 'REJECTED' });
    await expect(service.decide(tenantId, 'offer-1', OfferDecision.APPROVED, undefined, 'manager-1')).rejects.toThrow(ForbiddenException);
  });
});

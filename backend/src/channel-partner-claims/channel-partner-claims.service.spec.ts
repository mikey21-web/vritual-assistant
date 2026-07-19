import { Test, TestingModule } from '@nestjs/testing';
import { ChannelPartnerClaimsService } from './channel-partner-claims.service';
import { PrismaService } from '../prisma/prisma.service';
import { NormalizationService } from '../shared/normalization.service';
import { TimelineService } from '../timeline/timeline.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ForbiddenException } from '@nestjs/common';

describe('ChannelPartnerClaimsService', () => {
  let service: ChannelPartnerClaimsService;
  let prisma: any;

  const tenantId = 'tenant-1';

  beforeEach(async () => {
    prisma = {
      channelPartner: { findFirst: jest.fn().mockResolvedValue({ id: 'partner-1', tenantId }) },
      partnerLeadClaim: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'claim-1', ...data })),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'claim-1', tenantId, status: 'NEEDS_REVIEW', ...data })),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      commissionAccrual: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'accrual-1', status: 'PENDING', ...data })),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([
          { id: 'accrual-1', tenantId, channelPartnerId: 'partner-1', status: 'APPROVED', amountPaise: BigInt(50000) },
          { id: 'accrual-2', tenantId, channelPartnerId: 'partner-1', status: 'APPROVED', amountPaise: BigInt(30000) },
        ]),
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
        update: jest.fn(),
      },
      commissionPlan: { findFirst: jest.fn().mockResolvedValue(null) },
      commissionPayout: { create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'payout-1', ...data })) },
      $transaction: jest.fn().mockImplementation((fn: any) => fn(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChannelPartnerClaimsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NormalizationService, useValue: { normalizePhone: (p: string) => p.replace(/\D/g, '') } },
        { provide: TimelineService, useValue: { add: jest.fn() } },
        { provide: AuditLogsService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get(ChannelPartnerClaimsService);
  });

  it('registers a fresh phone as REGISTERED', async () => {
    const claim = await service.registerClaim(tenantId, { channelPartnerId: 'partner-1', phone: '9876543210' });
    expect(claim.status).toBe('REGISTERED');
  });

  it('marks a second registration by the same partner as ALREADY_REGISTERED', async () => {
    prisma.partnerLeadClaim.findFirst.mockResolvedValue({ id: 'existing', channelPartnerId: 'partner-1', phone: '9876543210' });
    const claim = await service.registerClaim(tenantId, { channelPartnerId: 'partner-1', phone: '9876543210' });
    expect(claim.status).toBe('ALREADY_REGISTERED');
  });

  it('flags a claim by a different partner as NEEDS_REVIEW without naming the other partner', async () => {
    prisma.partnerLeadClaim.findFirst.mockResolvedValue({ id: 'existing', channelPartnerId: 'partner-999', phone: '9876543210' });
    const claim = await service.registerClaim(tenantId, { channelPartnerId: 'partner-1', phone: '9876543210' });
    expect(claim.status).toBe('NEEDS_REVIEW');
    expect(JSON.stringify(claim)).not.toContain('partner-999');
  });

  it('refuses to resolve a claim that is not NEEDS_REVIEW', async () => {
    prisma.partnerLeadClaim.findFirst = jest.fn().mockResolvedValue({ id: 'claim-1', tenantId, status: 'REGISTERED' });
    await expect(service.resolve(tenantId, 'claim-1', 'REJECTED', 'dup', 'manager-1')).rejects.toThrow(ForbiddenException);
  });

  it('bundles only APPROVED accruals belonging to the partner into a payout and marks them PAID', async () => {
    const payout = await service.createPayout(tenantId, 'partner-1', ['accrual-1', 'accrual-2'], 'owner-1');
    expect(payout.amountPaise).toBe('80000');
    expect(prisma.commissionAccrual.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'PAID' }) }),
    );
  });

  it('refuses a payout if an accrual id does not match the approved set', async () => {
    prisma.commissionAccrual.findMany.mockResolvedValue([
      { id: 'accrual-1', tenantId, channelPartnerId: 'partner-1', status: 'APPROVED', amountPaise: BigInt(50000) },
    ]);
    await expect(service.createPayout(tenantId, 'partner-1', ['accrual-1', 'accrual-2'], 'owner-1')).rejects.toThrow(ForbiddenException);
  });
});

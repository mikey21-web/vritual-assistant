import { Test, TestingModule } from '@nestjs/testing';
import { ChannelPartnerClaimsService } from './channel-partner-claims.service';
import { PrismaService } from '../prisma/prisma.service';
import { NormalizationService } from '../shared/normalization.service';
import { TimelineService } from '../timeline/timeline.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

describe('ChannelPartnerClaimsService.getPerformance', () => {
  let service: ChannelPartnerClaimsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      channelPartner: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'p1', name: 'Ravi Realty', status: 'ACTIVE' },
          { id: 'p2', name: 'Star Brokers', status: 'ACTIVE' },
        ]),
      },
      partnerLeadClaim: {
        findMany: jest.fn().mockResolvedValue([
          { channelPartnerId: 'p1', status: 'REGISTERED' },
          { channelPartnerId: 'p1', status: 'NEEDS_REVIEW' },
          { channelPartnerId: 'p2', status: 'REGISTERED' },
        ]),
      },
      commissionAccrual: {
        findMany: jest.fn().mockResolvedValue([
          { channelPartnerId: 'p1', status: 'PAID', amountPaise: BigInt(50000) },
          { channelPartnerId: 'p1', status: 'PENDING', amountPaise: BigInt(30000) },
          { channelPartnerId: 'p2', status: 'PAID', amountPaise: BigInt(200000) },
        ]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChannelPartnerClaimsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NormalizationService, useValue: { normalizePhone: (p: string) => p } },
        { provide: TimelineService, useValue: { add: jest.fn() } },
        { provide: AuditLogsService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get(ChannelPartnerClaimsService);
  });

  it('ranks partners by commission earned, highest first', async () => {
    const rows = await service.getPerformance('t1');
    expect(rows[0].channelPartnerId).toBe('p2');
    expect(rows[0].commissionEarnedPaise).toBe('200000');
  });

  it('counts leads registered and disputed claims per partner', async () => {
    const rows = await service.getPerformance('t1');
    const p1 = rows.find(r => r.channelPartnerId === 'p1')!;
    expect(p1.leadsRegistered).toBe(2);
    expect(p1.disputedClaims).toBe(1);
  });

  it('separates earned (all accruals) from paid (PAID only)', async () => {
    const rows = await service.getPerformance('t1');
    const p1 = rows.find(r => r.channelPartnerId === 'p1')!;
    expect(p1.commissionEarnedPaise).toBe('80000');
    expect(p1.commissionPaidPaise).toBe('50000');
  });
});

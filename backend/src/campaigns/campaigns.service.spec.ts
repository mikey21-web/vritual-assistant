import { Test, TestingModule } from '@nestjs/testing';
import { CampaignsService } from './campaigns.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

describe('CampaignsService', () => {
  let service: CampaignsService;
  let prisma: any;
  const auditLogs = { log: jest.fn().mockResolvedValue({}) };

  const mockCampaign = {
    id: 'campaign-1',
    name: 'Test Campaign',
    sourceType: 'FORM',
    offer: 'Test Offer',
    landingUrl: 'https://example.com',
    conversionGoal: 'lead',
    crmDestination: null,
    bookingDestination: null,
    startDate: null,
    endDate: null,
    active: true,
    creatorId: 'user-1',
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmTerm: null,
    utmContent: null,
    formId: null,
    qrCodeId: null,
    tenantId: 'default-tenant',
    nurtureId: null,
    assignedAgentId: null,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    form: null,
    qrCode: null,
    nurtureSequence: null,
    _count: { leads: 5 },
  };

  const mockLead = {
    id: 'lead-1',
    campaignId: 'campaign-1',
    status: 'NEW',
    segment: 'COLD',
    score: 0,
  };

  beforeEach(async () => {
    prisma = {
      campaign: {
        findMany: jest.fn().mockResolvedValue([mockCampaign]),
        findUnique: jest.fn().mockResolvedValue(mockCampaign),
        create: jest.fn().mockResolvedValue(mockCampaign),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ ...mockCampaign, ...data }),
        ),
        count: jest.fn().mockResolvedValue(1),
      },
      lead: {
        findMany: jest.fn().mockResolvedValue([mockLead, { ...mockLead, segment: 'HOT', status: 'CONVERTED' }]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: auditLogs },
      ],
    }).compile();

    service = module.get<CampaignsService>(CampaignsService);
  });

  it('should create a campaign', async () => {
    const campaign = await service.create({
      name: 'Test Campaign',
      sourceType: 'FORM',
    }, 'user-1');
    expect(campaign.name).toBe('Test Campaign');
    expect(campaign.sourceType).toBe('FORM');
    expect(auditLogs.log).toHaveBeenCalledWith('campaign_created', 'Campaign', campaign.id, 'user-1');
  });

  it('should find all campaigns with pagination', async () => {
    const result = await service.findAll({ page: 1, limit: 10 });
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
    expect(result.meta.page).toBe(1);
    expect(result.meta.limit).toBe(10);
  });

  it('should filter campaigns by active status', async () => {
    await service.findAll({ active: 'true' });
    expect(prisma.campaign.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ active: true }),
      }),
    );
  });

  it('should find a campaign by id', async () => {
    const campaign = await service.findOne('campaign-1');
    expect(campaign.name).toBe('Test Campaign');
    expect(campaign._count.leads).toBe(5);
  });

  it('should throw NotFoundException when campaign not found', async () => {
    prisma.campaign.findUnique.mockResolvedValue(null);
    await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
  });

  it('should update a campaign', async () => {
    prisma.campaign.update.mockResolvedValue({ ...mockCampaign, name: 'Updated Campaign' });
    const campaign = await service.update('campaign-1', { name: 'Updated Campaign' }, 'user-1');
    expect(campaign.name).toBe('Updated Campaign');
    expect(auditLogs.log).toHaveBeenCalledWith('campaign_updated', 'Campaign', 'campaign-1', 'user-1');
  });

  it('should throw NotFoundException when updating non-existent campaign', async () => {
    prisma.campaign.findUnique.mockResolvedValue(null);
    await expect(service.update('nonexistent', { name: 'Nope' })).rejects.toThrow(NotFoundException);
  });

  it('should pause a campaign', async () => {
    const campaign = await service.pause('campaign-1', 'user-1');
    expect(campaign.active).toBe(false);
    expect(auditLogs.log).toHaveBeenCalledWith('campaign_paused', 'Campaign', 'campaign-1', 'user-1');
    expect(prisma.campaign.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { active: false } }),
    );
  });

  it('should throw NotFoundException when pausing non-existent campaign', async () => {
    prisma.campaign.findUnique.mockResolvedValue(null);
    await expect(service.pause('nonexistent')).rejects.toThrow(NotFoundException);
  });

  it('should activate a campaign', async () => {
    prisma.campaign.update.mockResolvedValue({ ...mockCampaign, active: true });
    const campaign = await service.activate('campaign-1', 'user-1');
    expect(campaign.active).toBe(true);
    expect(auditLogs.log).toHaveBeenCalledWith('campaign_activated', 'Campaign', 'campaign-1', 'user-1');
    expect(prisma.campaign.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { active: true } }),
    );
  });

  it('should throw NotFoundException when activating non-existent campaign', async () => {
    prisma.campaign.findUnique.mockResolvedValue(null);
    await expect(service.activate('nonexistent')).rejects.toThrow(NotFoundException);
  });

  it('should duplicate a campaign with (copy) suffix and inactive status', async () => {
    const dupCampaign = { ...mockCampaign, id: 'campaign-dup', name: 'Test Campaign (copy)', active: false };
    prisma.campaign.create.mockResolvedValue(dupCampaign);
    const campaign = await service.duplicate('campaign-1', 'user-1');
    expect(campaign.name).toContain('(copy)');
    expect(campaign.active).toBe(false);
    expect(auditLogs.log).toHaveBeenCalledWith('campaign_duplicated', 'Campaign', campaign.id, 'user-1', { originalId: 'campaign-1' });
    expect(prisma.campaign.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Test Campaign (copy)',
          active: false,
          tenantId: 'default-tenant',
        }),
      }),
    );
  });

  it('should throw NotFoundException when duplicating non-existent campaign', async () => {
    prisma.campaign.findUnique.mockResolvedValue(null);
    await expect(service.duplicate('nonexistent')).rejects.toThrow(NotFoundException);
  });

  it('should return performance metrics for a campaign', async () => {
    const result = await service.performance('campaign-1');
    expect(result.data.campaign.name).toBe('Test Campaign');
    expect(result.data.totalLeads).toBe(2);
    expect(result.data.hot).toBe(1);
    expect(result.data.warm).toBe(0);
    expect(result.data.cold).toBe(1);
    expect(result.data.converted).toBe(1);
    expect(result.data.conversionRate).toBe('50.0');
  });

  it('should return 0 conversion rate when there are no leads', async () => {
    prisma.lead.findMany.mockResolvedValue([]);
    const result = await service.performance('campaign-1');
    expect(result.data.totalLeads).toBe(0);
    expect(result.data.conversionRate).toBe(0);
  });

  it('should throw NotFoundException when getting performance for non-existent campaign', async () => {
    prisma.campaign.findUnique.mockResolvedValue(null);
    await expect(service.performance('nonexistent')).rejects.toThrow(NotFoundException);
  });
});

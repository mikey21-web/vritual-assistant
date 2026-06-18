import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CrmMappingsService } from './crm-mappings.service';
import { PrismaService } from '../prisma/prisma.service';
import { HubspotAdapter, SalesforceAdapter, ZohoAdapter } from '../shared/adapters/crm.adapter';

describe('CrmMappingsService', () => {
  let service: CrmMappingsService;
  let prisma: any;
  let hubspot: any;
  let salesforce: any;
  let zoho: any;

  const mockMapping = { id: 'map-1', name: 'HubSpot Map', crmType: 'hubspot', fieldMappings: { apiKey: 'test-key' } };

  beforeEach(async () => {
    prisma = {
      crmMapping: {
        findMany: jest.fn().mockResolvedValue([mockMapping]),
        findUnique: jest.fn().mockResolvedValue(mockMapping),
        create: jest.fn().mockResolvedValue(mockMapping),
        update: jest.fn().mockResolvedValue(mockMapping),
        count: jest.fn().mockResolvedValue(1),
      },
    };
    hubspot = { healthCheck: jest.fn().mockResolvedValue(true) };
    salesforce = { healthCheck: jest.fn().mockResolvedValue(false) };
    zoho = { healthCheck: jest.fn().mockResolvedValue(false) };

    const module = await Test.createTestingModule({
      providers: [
        CrmMappingsService,
        { provide: PrismaService, useValue: prisma },
        { provide: HubspotAdapter, useValue: hubspot },
        { provide: SalesforceAdapter, useValue: salesforce },
        { provide: ZohoAdapter, useValue: zoho },
      ],
    }).compile();
    service = module.get<CrmMappingsService>(CrmMappingsService);
  });

  it('should test HubSpot CRM and return healthy', async () => {
    const result = await service.test('map-1');
    expect(result.healthy).toBe(true);
    expect(result.test).toBe('success');
    expect(hubspot.healthCheck).toHaveBeenCalled();
  });

  it('should test Salesforce CRM and return unhealthy', async () => {
    prisma.crmMapping.findUnique.mockResolvedValue({ ...mockMapping, crmType: 'salesforce' });
    const result = await service.test('map-1');
    expect(result.healthy).toBe(false);
    expect(result.test).toBe('failed');
  });

  it('should test Zoho CRM and return unhealthy', async () => {
    prisma.crmMapping.findUnique.mockResolvedValue({ ...mockMapping, crmType: 'zoho' });
    const result = await service.test('map-1');
    expect(result.healthy).toBe(false);
    expect(result.test).toBe('failed');
    expect(zoho.healthCheck).toHaveBeenCalled();
  });

  it('should throw on non-existent mapping', async () => {
    prisma.crmMapping.findUnique.mockResolvedValue(null);
    await expect(service.test('missing')).rejects.toThrow(NotFoundException);
  });
});

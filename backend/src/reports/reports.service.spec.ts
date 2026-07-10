import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('ReportsService', () => {
  let service: ReportsService;
  let prisma: any;

  const mockReport = {
    id: 'report-1',
    tenantId: 'default-tenant',
    ownerId: 'user-1',
    name: 'Leads by source',
    entity: 'lead',
    isShared: false,
  };

  beforeEach(async () => {
    prisma = {
      savedReport: {
        findMany: jest.fn().mockResolvedValue([mockReport]),
        findFirst: jest.fn().mockResolvedValue(mockReport),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...mockReport, ...data })),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...mockReport, ...data })),
        delete: jest.fn().mockResolvedValue(mockReport),
      },
      lead: {
        count: jest.fn().mockResolvedValue(5),
        groupBy: jest.fn().mockResolvedValue([
          { status: 'NEW', _count: { id: 3 } },
          { status: 'QUALIFIED', _count: { id: 2 } },
        ]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ReportsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  describe('create', () => {
    it('rejects an entity not in the whitelist', async () => {
      await expect(
        service.create({ name: 'x', entity: 'users', config: {} }, 'default-tenant', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates a report for a whitelisted entity', async () => {
      const report = await service.create({ name: 'Leads', entity: 'lead', config: {} }, 'default-tenant', 'user-1');
      expect(report.entity).toBe('lead');
    });
  });

  describe('update / remove ownership', () => {
    it('forbids a non-owner from updating a report', async () => {
      await expect(
        service.update('report-1', { name: 'renamed' }, 'default-tenant', 'someone-else'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('forbids a non-owner from deleting a report', async () => {
      await expect(service.remove('report-1', 'default-tenant', 'someone-else')).rejects.toThrow(ForbiddenException);
    });

    it('allows the owner to update their report', async () => {
      const result = await service.update('report-1', { name: 'renamed' }, 'default-tenant', 'user-1');
      expect(result.name).toBe('renamed');
    });

    it('throws NotFoundException for a report in a different tenant', async () => {
      prisma.savedReport.findFirst.mockResolvedValue(null);
      await expect(service.findOne('report-1', 'other-tenant')).rejects.toThrow(NotFoundException);
    });
  });

  describe('run — whitelist enforcement (security-critical)', () => {
    it('rejects an entity outside the whitelist', async () => {
      await expect(
        service.run({ entity: 'users', metric: 'count' }, 'default-tenant'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a metric not allowed for the given entity', async () => {
      await expect(
        service.run({ entity: 'lead', metric: 'sum(amount)' }, 'default-tenant'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a groupBy field not in the entity allow-list', async () => {
      await expect(
        service.run({ entity: 'lead', metric: 'count', groupBy: 'password' }, 'default-tenant'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a filter field not in the entity allow-list', async () => {
      await expect(
        service.run({ entity: 'lead', metric: 'count', filters: [{ email: 'x' }] }, 'default-tenant'),
      ).rejects.toThrow(BadRequestException);
    });

    it('runs a valid whitelisted report and returns labeled series', async () => {
      const result = await service.run({ entity: 'lead', metric: 'count', groupBy: 'status' }, 'default-tenant');
      expect(result.labels).toEqual(['NEW', 'QUALIFIED']);
      expect(result.series[0].data).toEqual([3, 2]);
    });

    it('always scopes the aggregation query to the given tenantId', async () => {
      await service.run({ entity: 'lead', metric: 'count', groupBy: 'status' }, 'default-tenant');
      expect(prisma.lead.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ tenantId: 'default-tenant' }) }),
      );
    });
  });
});

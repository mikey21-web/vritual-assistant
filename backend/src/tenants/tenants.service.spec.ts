import { Test, TestingModule } from '@nestjs/testing';
import { TenantsService } from './tenants.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('TenantsService', () => {
  let service: TenantsService;
  let prisma: any;

  const mockTenant = {
    id: 'tenant-1',
    name: 'Acme Corp',
    slug: 'acme-corp',
    domain: 'acme.example.com',
    plan: 'pro',
    active: true,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
  };

  const mockTenants = [
    mockTenant,
    {
      id: 'tenant-2',
      name: 'Globex Inc',
      slug: 'globex',
      domain: null,
      plan: 'starter',
      active: true,
      createdAt: new Date('2025-02-01T00:00:00Z'),
      updatedAt: new Date('2025-02-01T00:00:00Z'),
    },
  ];

  beforeEach(async () => {
    prisma = {
      tenant: {
        findMany: jest.fn().mockResolvedValue(mockTenants),
        findUnique: jest.fn().mockResolvedValue(mockTenant),
        create: jest.fn().mockResolvedValue(mockTenant),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ ...mockTenant, ...data }),
        ),
      },
      user: { count: jest.fn().mockResolvedValue(5) },
      contact: { count: jest.fn().mockResolvedValue(120) },
      lead: { count: jest.fn().mockResolvedValue(340) },
      campaign: { count: jest.fn().mockResolvedValue(12) },
      integration: { count: jest.fn().mockResolvedValue(3) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TenantsService>(TenantsService);
  });

  describe('findAll', () => {
    it('should return all tenants ordered by createdAt descending', async () => {
      const tenants = await service.findAll();
      expect(tenants).toHaveLength(2);
      expect(prisma.tenant.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return an empty array when no tenants exist', async () => {
      prisma.tenant.findMany.mockResolvedValue([]);
      const tenants = await service.findAll();
      expect(tenants).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a tenant by id', async () => {
      const tenant = await service.findOne('tenant-1');
      expect(tenant.name).toBe('Acme Corp');
      expect(tenant.slug).toBe('acme-corp');
    });

    it('should throw NotFoundException when tenant not found', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findBySlug', () => {
    it('should return a tenant by slug', async () => {
      const tenant = await service.findBySlug('acme-corp');
      expect(tenant.name).toBe('Acme Corp');
      expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { slug: 'acme-corp' },
      });
    });

    it('should throw NotFoundException when slug not found', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);
      await expect(service.findBySlug('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a new tenant with default plan', async () => {
      prisma.tenant.findUnique.mockResolvedValueOnce(null); // no existing slug
      prisma.tenant.create.mockResolvedValue({
        ...mockTenant,
        id: 'tenant-new',
        name: 'NewCo',
        slug: 'newco',
      });

      const tenant = await service.create({ name: 'NewCo', slug: 'newco' });
      expect(tenant.name).toBe('NewCo');
      expect(prisma.tenant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'NewCo',
            slug: 'newco',
            plan: 'starter',
          }),
        }),
      );
    });

    it('should create a tenant with specified plan', async () => {
      prisma.tenant.findUnique.mockResolvedValueOnce(null); // no existing slug
      await service.create({ name: 'ProCo', slug: 'proco', plan: 'enterprise' });
      expect(prisma.tenant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ plan: 'enterprise' }),
        }),
      );
    });

    it('should throw NotFoundException (slug conflict) when slug already exists', async () => {
      prisma.tenant.findUnique.mockResolvedValue(mockTenant); // slug exists
      await expect(
        service.create({ name: 'Duplicate', slug: 'acme-corp' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should check slug uniqueness before creating', async () => {
      prisma.tenant.findUnique.mockResolvedValueOnce(null);
      await service.create({ name: 'NewCo', slug: 'newco' });
      expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { slug: 'newco' },
      });
    });
  });

  describe('update', () => {
    it('should update an existing tenant', async () => {
      prisma.tenant.update.mockResolvedValue({ ...mockTenant, name: 'Acme Corp Updated' });
      const tenant = await service.update('tenant-1', { name: 'Acme Corp Updated' });
      expect(tenant.name).toBe('Acme Corp Updated');
      expect(prisma.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tenant-1' },
          data: { name: 'Acme Corp Updated' },
        }),
      );
    });

    it('should throw NotFoundException when updating non-existent tenant', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);
      await expect(service.update('nonexistent', { name: 'Nope' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should verify tenant exists before updating', async () => {
      await service.update('tenant-1', { domain: 'new.example.com' });
      expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { id: 'tenant-1' },
      });
    });

    it('should allow updating plan and active status', async () => {
      await service.update('tenant-1', { plan: 'enterprise', active: false });
      expect(prisma.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { plan: 'enterprise', active: false },
        }),
      );
    });
  });

  describe('getStats', () => {
    it('should return aggregated statistics for a tenant', async () => {
      const stats = await service.getStats('tenant-1');
      expect(stats).toEqual({
        tenantId: 'tenant-1',
        users: 5,
        contacts: 120,
        leads: 340,
        campaigns: 12,
        integrations: 3,
      });
    });

    it('should call count on all related models with the correct tenantId', async () => {
      await service.getStats('tenant-1');
      expect(prisma.user.count).toHaveBeenCalledWith({ where: { tenantId: 'tenant-1' } });
      expect(prisma.contact.count).toHaveBeenCalledWith({ where: { tenantId: 'tenant-1' } });
      expect(prisma.lead.count).toHaveBeenCalledWith({ where: { tenantId: 'tenant-1' } });
      expect(prisma.campaign.count).toHaveBeenCalledWith({ where: { tenantId: 'tenant-1' } });
      expect(prisma.integration.count).toHaveBeenCalledWith({ where: { tenantId: 'tenant-1' } });
    });

    it('should return zeros when no resources exist', async () => {
      prisma.user.count.mockResolvedValue(0);
      prisma.contact.count.mockResolvedValue(0);
      prisma.lead.count.mockResolvedValue(0);
      prisma.campaign.count.mockResolvedValue(0);
      prisma.integration.count.mockResolvedValue(0);

      const stats = await service.getStats('tenant-empty');
      expect(stats).toEqual({
        tenantId: 'tenant-empty',
        users: 0,
        contacts: 0,
        leads: 0,
        campaigns: 0,
        integrations: 0,
      });
    });
  });
});

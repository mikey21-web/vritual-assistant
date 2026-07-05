import { Test, TestingModule } from '@nestjs/testing';
import { RoutingRulesService } from './routing-rules.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('RoutingRulesService', () => {
  let service: RoutingRulesService;
  let prisma: any;

  const mockRule = {
    id: 'rule-1',
    name: 'High value leads to senior agent',
    conditions: { sourceType: 'FORM', score: '90' },
    action: { assignTo: 'agent-senior-1' },
    priority: 1,
    active: true,
    tenantId: 'default-tenant',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
  };

  const mockRules = [
    mockRule,
    {
      ...mockRule,
      id: 'rule-2',
      name: 'Chat leads to bot',
      conditions: { sourceType: 'CHAT' },
      action: { assignTo: 'bot-1' },
      priority: 2,
    },
  ];

  beforeEach(async () => {
    prisma = {
      routingRule: {
        findMany: jest.fn().mockResolvedValue(mockRules),
        findUnique: jest.fn().mockResolvedValue(mockRule),
        create: jest.fn().mockResolvedValue(mockRule),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ ...mockRule, ...data }),
        ),
        delete: jest.fn().mockResolvedValue(mockRule),
        count: jest.fn().mockResolvedValue(mockRules.length),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoutingRulesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<RoutingRulesService>(RoutingRulesService);
  });

  describe('findAll', () => {
    it('should return paginated routing rules', async () => {
      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });

    it('should apply default pagination when no query is given', async () => {
      const result = await service.findAll();
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(50);
    });

    it('should order rules by createdAt descending', async () => {
      await service.findAll();
      expect(prisma.routingRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should compute correct skip for pagination', async () => {
      await service.findAll({ page: 3, limit: 20 });
      expect(prisma.routingRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 40, take: 20 }),
      );
    });
  });

  describe('create', () => {
    it('should create a routing rule with conditions and action defaults', async () => {
      const rule = await service.create({
        name: 'New Rule',
        conditions: { sourceType: 'EMAIL' },
        action: { assignTo: 'agent-2' },
      });
      expect(rule.name).toBe('High value leads to senior agent');
      expect(prisma.routingRule.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'New Rule',
            conditions: { sourceType: 'EMAIL' },
            action: { assignTo: 'agent-2' },
          }),
        }),
      );
    });

    it('should set empty objects for conditions and action when not provided', async () => {
      await service.create({ name: 'Fallback Rule' });
      expect(prisma.routingRule.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            conditions: {},
            action: {},
          }),
        }),
      );
    });

    it('should pass through additional properties like priority and active', async () => {
      await service.create({
        name: 'Priority Rule',
        priority: 5,
        active: false,
        conditions: { sourceType: 'API' },
        action: { assignTo: 'agent-3' },
      });
      expect(prisma.routingRule.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ priority: 5, active: false }),
        }),
      );
    });
  });

  describe('update', () => {
    it('should update an existing routing rule', async () => {
      prisma.routingRule.update.mockResolvedValue({
        ...mockRule,
        name: 'Updated Rule',
      });
      const rule = await service.update('rule-1', { name: 'Updated Rule' });
      expect(rule.name).toBe('Updated Rule');
      expect(prisma.routingRule.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rule-1' },
          data: { name: 'Updated Rule' },
        }),
      );
    });

    it('should throw NotFoundException when updating a non-existent rule', async () => {
      prisma.routingRule.findUnique.mockResolvedValue(null);
      await expect(service.update('nonexistent', { name: 'Nope' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should verify the rule exists before updating', async () => {
      await service.update('rule-1', { priority: 10 });
      expect(prisma.routingRule.findUnique).toHaveBeenCalledWith({
        where: { id: 'rule-1' },
      });
    });
  });

  describe('remove', () => {
    it('should delete an existing routing rule', async () => {
      const rule = await service.remove('rule-1');
      expect(rule.id).toBe('rule-1');
      expect(prisma.routingRule.delete).toHaveBeenCalledWith({
        where: { id: 'rule-1' },
      });
    });

    it('should throw NotFoundException when deleting a non-existent rule', async () => {
      prisma.routingRule.findUnique.mockResolvedValue(null);
      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should verify the rule exists before deleting', async () => {
      await service.remove('rule-1');
      expect(prisma.routingRule.findUnique).toHaveBeenCalledWith({
        where: { id: 'rule-1' },
      });
    });
  });

  describe('test', () => {
    it('should return matched=true when all conditions pass', async () => {
      const result = await service.test({
        conditions: { sourceType: 'FORM', score: '90' },
        testLead: { sourceType: 'FORM', score: 90 },
      });
      expect(result.matched).toBe(true);
      expect(result.results.sourceType).toBe(true);
      expect(result.results.score).toBe(true);
    });

    it('should return matched=false when a condition fails', async () => {
      const result = await service.test({
        conditions: { sourceType: 'FORM', score: '80' },
        testLead: { sourceType: 'FORM', score: 90 },
      });
      expect(result.matched).toBe(false);
      expect(result.results.sourceType).toBe(true);
      expect(result.results.score).toBe(false);
    });

    it('should return matched=false when no conditions match', async () => {
      const result = await service.test({
        conditions: { sourceType: 'CHAT', region: 'US' },
        testLead: { sourceType: 'FORM', region: 'EU' },
      });
      expect(result.matched).toBe(false);
      expect(result.results.sourceType).toBe(false);
      expect(result.results.region).toBe(false);
    });

    it('should handle empty conditions gracefully', async () => {
      const result = await service.test({
        conditions: {},
        testLead: { sourceType: 'FORM' },
      });
      expect(result.matched).toBe(true);
      expect(result.results).toEqual({});
    });

    it('should handle undefined fields in test lead as empty string', async () => {
      const result = await service.test({
        conditions: { sourceType: 'FORM' },
        testLead: {},
      });
      expect(result.matched).toBe(false);
      expect(result.results.sourceType).toBe(false);
    });

    it('should perform case-insensitive comparison', async () => {
      const result = await service.test({
        conditions: { sourceType: 'form' },
        testLead: { sourceType: 'FORM' },
      });
      expect(result.matched).toBe(true);
      expect(result.results.sourceType).toBe(true);
    });
  });
});

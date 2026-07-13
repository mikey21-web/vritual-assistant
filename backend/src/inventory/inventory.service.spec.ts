import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('InventoryService', () => {
  let service: InventoryService;
  let prisma: any;

  const mockItem = { id: 'item-1', tenantId: 'default-tenant', name: 'Chairs', quantity: 100, minStock: 10, locationId: null };

  beforeEach(async () => {
    prisma = {
      inventoryItem: {
        findMany: jest.fn().mockResolvedValue([mockItem]),
        findUnique: jest.fn().mockResolvedValue(mockItem),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'item-1', ...data })),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...mockItem, ...data })),
        count: jest.fn().mockResolvedValue(1),
      },
      stockMovement: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'sm-1', ...data })),
        count: jest.fn().mockResolvedValue(0),
      },
      inventoryLocation: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'loc-1', ...data })),
      },
      inventoryAllocation: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { qtyAllocated: 0 } }),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'alloc-1', ...data })),
        findMany: jest.fn().mockResolvedValue([]),
      },
      businessSettings: {
        findFirst: jest.fn().mockResolvedValue({ inventoryEnforcement: 'ADVISORY' }),
      },
      $transaction: jest.fn().mockImplementation((ops: any[]) => Promise.all(ops)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [InventoryService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  describe('stats', () => {
    it('should classify items by stock level', async () => {
      prisma.inventoryItem.findMany.mockResolvedValue([
        { ...mockItem, quantity: 100 },
        { ...mockItem, id: 'item-2', quantity: 5, minStock: 10 },
        { ...mockItem, id: 'item-3', quantity: 0 },
      ]);
      const s = await service.stats();
      expect(s.totalItems).toBe(3);
      expect(s.lowStock).toBe(1);
      expect(s.outOfStock).toBe(1);
    });
  });

  describe('createMovement', () => {
    it('should increase item quantity for RECEIVED', async () => {
      await service.createMovement({ itemId: 'item-1', type: 'RECEIVED', qty: 20 });
      expect(prisma.inventoryItem.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ quantity: 120 }) }),
      );
    });

    it('should decrease item quantity for SHIPPED', async () => {
      await service.createMovement({ itemId: 'item-1', type: 'SHIPPED', qty: 30 });
      expect(prisma.inventoryItem.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ quantity: 70 }) }),
      );
    });
  });

  describe('allocateToEvent', () => {
    it('should allow allocation within available stock', async () => {
      const alloc = await service.allocateToEvent('event-1', { itemId: 'item-1', qtyAllocated: 50 });
      expect(alloc.qtyAllocated).toBe(50);
    });

    it('should allow over-allocation in ADVISORY mode (flagged, not blocked)', async () => {
      const alloc = await service.allocateToEvent('event-1', { itemId: 'item-1', qtyAllocated: 150 });
      expect(alloc.qtyAllocated).toBe(150);
    });

    it('should block over-allocation in STRICT mode', async () => {
      prisma.businessSettings.findFirst.mockResolvedValue({ inventoryEnforcement: 'STRICT' });
      await expect(service.allocateToEvent('event-1', { itemId: 'item-1', qtyAllocated: 150 })).rejects.toThrow(BadRequestException);
    });

    it('should account for already-allocated quantity when checking availability', async () => {
      prisma.businessSettings.findFirst.mockResolvedValue({ inventoryEnforcement: 'STRICT' });
      prisma.inventoryAllocation.aggregate.mockResolvedValue({ _sum: { qtyAllocated: 60 } });
      await expect(service.allocateToEvent('event-1', { itemId: 'item-1', qtyAllocated: 50 })).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for a non-existent item', async () => {
      prisma.inventoryItem.findUnique.mockResolvedValue(null);
      await expect(service.allocateToEvent('event-1', { itemId: 'nonexistent', qtyAllocated: 1 })).rejects.toThrow(NotFoundException);
    });
  });
});

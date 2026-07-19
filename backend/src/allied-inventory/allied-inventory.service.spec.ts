import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { AlliedInventoryService } from './allied-inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

describe('AlliedInventoryService', () => {
  let service: AlliedInventoryService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      alliedInventoryItem: {
        findFirst: jest.fn().mockResolvedValue({ id: 'item-1', tenantId: 't1', status: 'AVAILABLE' }),
        update: jest.fn().mockResolvedValue({}),
      },
      alliedInventoryAllocation: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'alloc-1', ...data })),
        findFirst: jest.fn().mockResolvedValue({ id: 'alloc-1', tenantId: 't1', itemId: 'item-1' }),
        delete: jest.fn().mockResolvedValue({}),
      },
      booking: { findFirst: jest.fn().mockResolvedValue({ id: 'b1', tenantId: 't1' }) },
      inventoryReleaseBatch: {
        findFirst: jest.fn().mockResolvedValue({ id: 'batch-1', tenantId: 't1', status: 'PLANNED', unitIds: ['u1'] }),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'batch-1', ...data })),
      },
      $transaction: jest.fn().mockImplementation((ops: any[]) => Promise.all(ops)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlliedInventoryService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get(AlliedInventoryService);
  });

  it('rejects allocating an item that is not AVAILABLE', async () => {
    prisma.alliedInventoryItem.findFirst.mockResolvedValueOnce({ id: 'item-1', tenantId: 't1', status: 'ALLOCATED' });
    await expect(service.allocateItem('t1', 'item-1', 'b1')).rejects.toThrow(ForbiddenException);
  });

  it('allocates an available item and marks it ALLOCATED', async () => {
    await service.allocateItem('t1', 'item-1', 'b1', 'user-1');
    expect(prisma.alliedInventoryItem.update).toHaveBeenCalledWith({ where: { id: 'item-1' }, data: { status: 'ALLOCATED' } });
  });

  it('rejects approving a release batch that is not PLANNED', async () => {
    prisma.inventoryReleaseBatch.findFirst.mockResolvedValueOnce({ id: 'batch-1', tenantId: 't1', status: 'RELEASED', unitIds: [] });
    await expect(service.approveReleaseBatch('t1', 'batch-1', 'user-1')).rejects.toThrow(ForbiddenException);
  });

  it('approves a PLANNED release batch', async () => {
    const result = await service.approveReleaseBatch('t1', 'batch-1', 'user-1');
    expect(result.status).toBe('RELEASED');
  });
});

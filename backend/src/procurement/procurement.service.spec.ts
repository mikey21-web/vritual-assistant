import { Test, TestingModule } from '@nestjs/testing';
import { ProcurementService } from './procurement.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('ProcurementService', () => {
  let service: ProcurementService;
  let prisma: any;

  const mockPO = { id: 'po-1', partnerId: 'partner-1', totalValue: 0, lineItems: [] };

  beforeEach(async () => {
    prisma = {
      partner: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'p-1', ...data })), count: jest.fn().mockResolvedValue(0) },
      vendorBooking: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue({ id: 'vb-1', status: 'DRAFT' }),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'vb-1', ...data })),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'vb-1', ...data })),
        count: jest.fn().mockResolvedValue(0),
      },
      purchaseOrder: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(mockPO),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'po-1', ...data })),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'po-1', ...data })),
        count: jest.fn().mockResolvedValue(0),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ProcurementService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<ProcurementService>(ProcurementService);
  });

  describe('createPurchaseOrder', () => {
    it('should compute line item totals and totalValue', async () => {
      await service.createPurchaseOrder({ partnerId: 'partner-1', lineItems: [{ description: 'Chairs', qty: 10, unitCost: 50 }, { description: 'Tables', qty: 2, unitCost: 200 }] });
      expect(prisma.purchaseOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ totalValue: 900 }),
        }),
      );
    });
  });

  describe('updateVendorBooking', () => {
    it('should throw NotFoundException for a non-existent booking', async () => {
      prisma.vendorBooking.findUnique.mockResolvedValue(null);
      await expect(service.updateVendorBooking('nonexistent', { status: 'CONFIRMED' })).rejects.toThrow(NotFoundException);
    });

    it('should update status', async () => {
      const b = await service.updateVendorBooking('vb-1', { status: 'CONFIRMED' });
      expect(b.status).toBe('CONFIRMED');
    });
  });

  describe('updatePurchaseOrder', () => {
    it('should throw NotFoundException for a non-existent PO', async () => {
      prisma.purchaseOrder.findUnique.mockResolvedValue(null);
      await expect(service.updatePurchaseOrder('nonexistent', { status: 'RECEIVED' })).rejects.toThrow(NotFoundException);
    });
  });
});

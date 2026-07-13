import { Test, TestingModule } from '@nestjs/testing';
import { ClientFinanceService } from './client-finance.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('ClientFinanceService', () => {
  let service: ClientFinanceService;
  let prisma: any;

  const mockInvoice = {
    id: 'inv-1', tenantId: 'default-tenant', invoiceNumber: 'INV-1', subtotal: 1000, gstTotal: 180, grandTotal: 1180,
    status: 'DRAFT', contactId: 'contact-1', lineItems: [{ id: 'li-1', description: 'Item', qty: 1, unitPrice: 1000, total: 1000 }],
  };

  beforeEach(async () => {
    prisma = {
      invoice: {
        findMany: jest.fn().mockResolvedValue([mockInvoice]),
        findUnique: jest.fn().mockResolvedValue(mockInvoice),
        create: jest.fn().mockResolvedValue(mockInvoice),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...mockInvoice, ...data })),
        count: jest.fn().mockResolvedValue(1),
      },
      quotation: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue({ id: 'q-1', sections: [{ lineItems: [{ total: 500 }, { total: 250 }] }] }),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'q-1', ...data })),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'q-1', ...data })),
        count: jest.fn().mockResolvedValue(0),
      },
      contract: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue({ id: 'c-1', status: 'DRAFT' }),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'c-1', ...data })),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'c-1', ...data })),
        count: jest.fn().mockResolvedValue(0),
      },
      transaction: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'txn-1', ...data })),
        count: jest.fn().mockResolvedValue(0),
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ClientFinanceService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<ClientFinanceService>(ClientFinanceService);
  });

  describe('createInvoice', () => {
    it('should compute subtotal, gstTotal, and grandTotal from line items', async () => {
      await service.createInvoice({ contactId: 'contact-1', gstPercent: 18, lineItems: [{ description: 'Item', qty: 2, unitPrice: 500 }] });
      expect(prisma.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ subtotal: 1000, gstTotal: 180, grandTotal: 1180 }),
        }),
      );
    });
  });

  describe('updateInvoice', () => {
    it('should not set paidAt unless status is PAID', async () => {
      await service.updateInvoice('inv-1', { status: 'SENT' });
      expect(prisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'SENT' } }),
      );
    });

    it('should stamp paidAt when status transitions to PAID', async () => {
      await service.updateInvoice('inv-1', { status: 'PAID' });
      expect(prisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'PAID', paidAt: expect.any(Date) }) }),
      );
    });

    it('should throw NotFoundException for a non-existent invoice', async () => {
      prisma.invoice.findUnique.mockResolvedValue(null);
      await expect(service.updateInvoice('nonexistent', { status: 'PAID' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('createContract', () => {
    it('should use the provided amount when given', async () => {
      const c = await service.createContract({ amount: 5000 });
      expect(c.amount).toBe(5000);
      expect(prisma.quotation.findUnique).not.toHaveBeenCalled();
    });

    it('should derive amount from the quotation when not provided', async () => {
      const c = await service.createContract({ quotationId: 'q-1' });
      expect(c.amount).toBe(750);
    });
  });

  describe('getTaxReport', () => {
    it('should compute collected, paid, and net payable', async () => {
      prisma.invoice.findMany.mockResolvedValue([{ gstTotal: 180 }, { gstTotal: 90 }]);
      prisma.transaction.findMany.mockResolvedValue([{ amount: 1000, gstPercent: 18 }]);
      const report = await service.getTaxReport();
      expect(report.taxCollected).toBe(270);
      expect(report.taxPaid).toBe(180);
      expect(report.netPayable).toBe(90);
    });
  });

  describe('getProfitAndLoss', () => {
    it('should compute income, expenses, and net profit', async () => {
      prisma.transaction.findMany
        .mockResolvedValueOnce([{ amount: 5000 }, { amount: 2000 }])
        .mockResolvedValueOnce([{ amount: 1500 }]);
      const pl = await service.getProfitAndLoss();
      expect(pl.income).toBe(7000);
      expect(pl.expenses).toBe(1500);
      expect(pl.netProfit).toBe(5500);
    });
  });

  describe('getEventProfitability', () => {
    it('should group income and expenses per event', async () => {
      prisma.transaction.findMany.mockResolvedValue([
        { eventId: 'event-1', type: 'INCOME', amount: 1000 },
        { eventId: 'event-1', type: 'EXPENSE', amount: 300 },
        { eventId: 'event-2', type: 'INCOME', amount: 500 },
      ]);
      const rows = await service.getEventProfitability();
      const e1 = rows.find(r => r.eventId === 'event-1')!;
      expect(e1.income).toBe(1000);
      expect(e1.expenses).toBe(300);
      expect(e1.profit).toBe(700);
    });
  });
});

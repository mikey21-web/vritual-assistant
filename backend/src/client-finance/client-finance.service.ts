import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function genNumber(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

@Injectable()
export class ClientFinanceService {
  constructor(private prisma: PrismaService) {}

  // --- Invoices ---
  findInvoices(tenantId: string, query: any = {}) {
    const { status, contactId, eventId, page = 1, limit = 20 } = query;
    const where: any = { tenantId };
    if (status) where.status = status;
    if (contactId) where.contactId = contactId;
    if (eventId) where.eventId = eventId;
    return Promise.all([
      this.prisma.invoice.findMany({ where, skip: (+page - 1) * +limit, take: +limit, orderBy: { createdAt: 'desc' }, include: { lineItems: true, contact: { select: { id: true, name: true } } } }),
      this.prisma.invoice.count({ where }),
    ]).then(([data, total]) => ({ data, meta: { total, page: +page, limit: +limit } }));
  }

  async findInvoice(tenantId: string, id: string) {
    const inv = await this.prisma.invoice.findFirst({ where: { id, tenantId }, include: { lineItems: true, contact: true } });
    if (!inv) throw new NotFoundException('Invoice not found');
    return inv;
  }

  createInvoice(tenantId: string, data: any) {
    const { lineItems = [], ...rest } = data;
    const subtotal = lineItems.reduce((s: number, li: any) => s + (li.total ?? li.qty * li.unitPrice), 0);
    const gstTotal = rest.gstPercent ? subtotal * (rest.gstPercent / 100) : 0;
    return this.prisma.invoice.create({
      data: {
        ...rest,
        tenantId,
        invoiceNumber: genNumber('INV'),
        subtotal,
        gstTotal,
        grandTotal: subtotal + gstTotal,
        lineItems: { create: lineItems.map((li: any) => ({ description: li.description, qty: li.qty ?? 1, unitPrice: li.unitPrice, total: li.total ?? li.qty * li.unitPrice })) },
      },
      include: { lineItems: true },
    });
  }

  // Accrual discipline: an invoice only becomes income when explicitly marked PAID here —
  // never inferred just from the invoice existing (matches Vyuha's own stated accounting rule).
  async updateInvoice(tenantId: string, id: string, data: any) {
    await this.findInvoice(tenantId, id);
    const patch: any = { ...data };
    if (data.status === 'PAID' && !data.paidAt) patch.paidAt = new Date();
    return this.prisma.invoice.update({ where: { id }, data: patch });
  }

  // --- Quotations ---
  findQuotations(tenantId: string, query: any = {}) {
    const { status, contactId, eventId, page = 1, limit = 20 } = query;
    const where: any = { tenantId };
    if (status) where.status = status;
    if (contactId) where.contactId = contactId;
    if (eventId) where.eventId = eventId;
    return Promise.all([
      this.prisma.quotation.findMany({ where, skip: (+page - 1) * +limit, take: +limit, orderBy: { createdAt: 'desc' }, include: { sections: { include: { lineItems: true } }, contact: { select: { id: true, name: true } } } }),
      this.prisma.quotation.count({ where }),
    ]).then(([data, total]) => ({ data, meta: { total, page: +page, limit: +limit } }));
  }

  async findQuotation(tenantId: string, id: string) {
    const q = await this.prisma.quotation.findFirst({ where: { id, tenantId }, include: { sections: { include: { lineItems: true } }, contact: true } });
    if (!q) throw new NotFoundException('Quotation not found');
    return q;
  }

  createQuotation(tenantId: string, data: any) {
    const { sections = [], ...rest } = data;
    return this.prisma.quotation.create({
      data: {
        ...rest,
        tenantId,
        quoteNumber: genNumber('Q'),
        sections: {
          create: sections.map((s: any, i: number) => ({
            title: s.title,
            order: s.order ?? i,
            lineItems: { create: (s.lineItems || []).map((li: any) => ({ description: li.description, qty: li.qty ?? 1, unitPrice: li.unitPrice, total: li.total ?? li.qty * li.unitPrice })) },
          })),
        },
      },
      include: { sections: { include: { lineItems: true } } },
    });
  }

  async updateQuotation(tenantId: string, id: string, data: any) { await this.findQuotation(tenantId, id); return this.prisma.quotation.update({ where: { id }, data }); }

  // --- Contracts (own "New contract" flow, or convert an accepted quotation) ---
  findContracts(tenantId: string, query: any = {}) {
    const { status, page = 1, limit = 20 } = query;
    const where: any = { tenantId };
    if (status) where.status = status;
    return Promise.all([
      this.prisma.contract.findMany({ where, skip: (+page - 1) * +limit, take: +limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.contract.count({ where }),
    ]).then(([data, total]) => ({ data, meta: { total, page: +page, limit: +limit } }));
  }

  async findContract(tenantId: string, id: string) {
    const c = await this.prisma.contract.findFirst({ where: { id, tenantId } });
    if (!c) throw new NotFoundException('Contract not found');
    return c;
  }

  async createContract(tenantId: string, data: any) {
    let amount = data.amount ?? 0;
    if (data.quotationId && !data.amount) {
      const q = await this.prisma.quotation.findFirst({ where: { id: data.quotationId, tenantId }, include: { sections: { include: { lineItems: true } } } });
      amount = q?.sections.reduce((s, sec) => s + sec.lineItems.reduce((ss, li) => ss + li.total, 0), 0) ?? 0;
    }
    return this.prisma.contract.create({ data: { ...data, tenantId, amount, contractNumber: genNumber('C') } });
  }

  async updateContract(tenantId: string, id: string, data: any) { await this.findContract(tenantId, id); return this.prisma.contract.update({ where: { id }, data }); }

  // --- Transactions ---
  findTransactions(tenantId: string, query: any = {}) {
    const { type, status, eventId, page = 1, limit = 20 } = query;
    const where: any = { tenantId };
    if (type) where.type = type;
    if (status) where.status = status;
    if (eventId) where.eventId = eventId;
    return Promise.all([
      this.prisma.transaction.findMany({ where, skip: (+page - 1) * +limit, take: +limit, orderBy: { date: 'desc' } }),
      this.prisma.transaction.count({ where }),
    ]).then(([data, total]) => ({ data, meta: { total, page: +page, limit: +limit } }));
  }
  createTransaction(tenantId: string, data: any) { return this.prisma.transaction.create({ data: { ...data, tenantId } }); }


  // --- Reports ---
  async getTaxReport(tenantId: string) {
    const [paidInvoices, paidExpenseTxns] = await Promise.all([
      this.prisma.invoice.findMany({ where: { tenantId, status: 'PAID' } }),
      this.prisma.transaction.findMany({ where: { tenantId, type: 'EXPENSE', status: 'PAID' } }),
    ]);
    const taxCollected = paidInvoices.reduce((s, i) => s + i.gstTotal, 0);
    const taxPaid = paidExpenseTxns.reduce((s, t) => s + (t.gstPercent ? t.amount * (t.gstPercent / 100) : 0), 0);
    return { taxCollected, taxPaid, netPayable: taxCollected - taxPaid };
  }

  async getProfitAndLoss(tenantId: string) {
    const [incomeTxns, expenseTxns] = await Promise.all([
      this.prisma.transaction.findMany({ where: { tenantId, type: 'INCOME', status: 'RECEIVED' } }),
      this.prisma.transaction.findMany({ where: { tenantId, type: 'EXPENSE', status: 'PAID' } }),
    ]);
    const income = incomeTxns.reduce((s, t) => s + t.amount, 0);
    const expenses = expenseTxns.reduce((s, t) => s + t.amount, 0);
    return { income, expenses, netProfit: income - expenses };
  }

  async getCashFlow(tenantId: string) {
    const [cashIn, cashOut] = await Promise.all([
      this.prisma.transaction.aggregate({ where: { tenantId, type: 'INCOME', status: 'RECEIVED' }, _sum: { amount: true } }),
      this.prisma.transaction.aggregate({ where: { tenantId, type: 'EXPENSE', status: 'PAID' }, _sum: { amount: true } }),
    ]);
    const inflow = cashIn._sum.amount || 0;
    const outflow = cashOut._sum.amount || 0;
    return { inflow, outflow, netCashFlow: inflow - outflow };
  }

  async getBalanceSheet(tenantId: string) {
    const [receivablesInvoices, payablesTxns] = await Promise.all([
      this.prisma.invoice.findMany({ where: { tenantId, status: { in: ['SENT', 'OVERDUE', 'PENDING'] } } }),
      this.prisma.transaction.findMany({ where: { tenantId, type: 'EXPENSE', status: { in: ['PENDING', 'OVERDUE'] } } }),
    ]);
    const receivables = receivablesInvoices.reduce((s, i) => s + i.grandTotal, 0);
    const payables = payablesTxns.reduce((s, t) => s + t.amount, 0);
    return { receivables, payables, netPosition: receivables - payables };
  }

  async getVendorPayments(tenantId: string) {
    const vendorTxns = await this.prisma.transaction.findMany({ where: { tenantId, partyType: 'VENDOR' } });
    const paid = vendorTxns.filter(t => t.status === 'PAID').reduce((s, t) => s + t.amount, 0);
    const pending = vendorTxns.filter(t => t.status !== 'PAID').reduce((s, t) => s + t.amount, 0);
    return { paid, pending, total: paid + pending };
  }

  async getEventProfitability(tenantId: string) {
    const txns = await this.prisma.transaction.findMany({ where: { tenantId, eventId: { not: null } } });
    const byEvent = new Map<string, { income: number; expenses: number }>();
    for (const t of txns) {
      const key = t.eventId as string;
      const row = byEvent.get(key) || { income: 0, expenses: 0 };
      if (t.type === 'INCOME') row.income += t.amount; else row.expenses += t.amount;
      byEvent.set(key, row);
    }
    return Array.from(byEvent.entries()).map(([eventId, v]) => ({ eventId, ...v, profit: v.income - v.expenses }));
  }
}

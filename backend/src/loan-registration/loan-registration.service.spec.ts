import { NotFoundException } from '@nestjs/common';
import { LoanRegistrationService } from './loan-registration.service';

describe('LoanRegistrationService', () => {
  const prisma = {
    booking: { findFirst: jest.fn() },
    loanRegistrationCase: { upsert: jest.fn(), update: jest.fn() },
    buyerDocument: { findMany: jest.fn() },
    generatedDocument: { findMany: jest.fn() },
  } as any;
  const service = new LoanRegistrationService(prisma);

  beforeEach(() => jest.clearAllMocks());

  it('getOrCreate throws when booking missing', async () => {
    prisma.booking.findFirst.mockResolvedValue(null);
    await expect(service.getOrCreate('t1', 'b1')).rejects.toThrow(NotFoundException);
  });

  it('getOrCreate upserts the case for an existing booking', async () => {
    prisma.booking.findFirst.mockResolvedValue({ id: 'b1' });
    prisma.loanRegistrationCase.upsert.mockResolvedValue({ id: 'lc1', bookingId: 'b1' });
    const result = await service.getOrCreate('t1', 'b1');
    expect(prisma.loanRegistrationCase.upsert).toHaveBeenCalledWith({
      where: { bookingId: 'b1' },
      create: { tenantId: 't1', bookingId: 'b1' },
      update: {},
    });
    expect(result).toEqual({ id: 'lc1', bookingId: 'b1' });
  });

  it('update converts paise fields to BigInt and dates', async () => {
    prisma.booking.findFirst.mockResolvedValue({ id: 'b1' });
    prisma.loanRegistrationCase.upsert.mockResolvedValue({ id: 'lc1' });
    prisma.loanRegistrationCase.update.mockResolvedValue({ id: 'lc1' });

    await service.update('t1', 'b1', {
      lenderName: 'HDFC',
      loanAmountPaise: 5000000,
      sanctionDate: '2026-07-01',
    });

    expect(prisma.loanRegistrationCase.update).toHaveBeenCalledWith({
      where: { bookingId: 'b1' },
      data: expect.objectContaining({
        lenderName: 'HDFC',
        loanAmountPaise: 5000000n,
        sanctionDate: new Date('2026-07-01'),
      }),
    });
  });

  it('getWorkspace aggregates loan status, KYC checklist, and documents, flagging missing docs', async () => {
    prisma.booking.findFirst.mockResolvedValue({ id: 'b1', leadId: 'l1' });
    prisma.loanRegistrationCase.upsert.mockResolvedValue({
      id: 'lc1', loanAmountPaise: 5000000n, disbursedAmountPaise: null, registrationChargesPaise: null,
    });
    prisma.buyerDocument.findMany.mockResolvedValue([
      { id: 'd1', type: 'PAN', status: 'VERIFIED' },
      { id: 'd2', type: 'AADHAAR', status: 'PENDING' },
    ]);
    prisma.generatedDocument.findMany.mockResolvedValue([
      { id: 'g1', snapshot: { documentType: 'ALLOTMENT_LETTER' }, esignRequests: [{ status: 'SIGNED' }] },
    ]);

    const workspace = await service.getWorkspace('t1', 'b1');

    expect(workspace.loanRegistration.loanAmountPaise).toBe('5000000');
    expect(workspace.kycChecklist).toHaveLength(2);
    expect(workspace.documents).toEqual([{ id: 'g1', documentType: 'ALLOTMENT_LETTER', esignStatus: 'SIGNED' }]);
    expect(workspace.missingBeforeRegistration).toEqual(['AADHAAR']);
  });
});

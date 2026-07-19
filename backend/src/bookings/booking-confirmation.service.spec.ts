import { Test, TestingModule } from '@nestjs/testing';
import { BookingConfirmationService } from './booking-confirmation.service';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ConflictException, ForbiddenException } from '@nestjs/common';

describe('BookingConfirmationService', () => {
  let service: BookingConfirmationService;
  let prisma: any;

  const tenantId = 'tenant-1';
  const unit = { id: 'unit-1', tenantId, unitNumber: '101', status: 'ON_HOLD', version: 1 };
  const booking = { id: 'booking-1', tenantId, leadId: 'lead-1', unitId: 'unit-1', costSheetId: 'sheet-1', status: 'PENDING' };
  const hold = { id: 'hold-1', unitId: 'unit-1', leadId: 'lead-1', status: 'ACTIVE' };
  const costSheet = { id: 'sheet-1', status: 'APPROVED', expiresAt: null };
  const verifiedDocs = [
    { type: 'PAN', status: 'VERIFIED' },
    { type: 'ADDRESS_PROOF', status: 'WAIVED' },
  ];

  beforeEach(async () => {
    prisma = {
      booking: {
        findFirst: jest.fn().mockResolvedValue(booking),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...booking, ...data })),
      },
      unit: {
        findUniqueOrThrow: jest.fn().mockResolvedValue(unit),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      unitHold: {
        findFirst: jest.fn().mockResolvedValue(hold),
        update: jest.fn().mockResolvedValue({}),
      },
      costSheet: { findUniqueOrThrow: jest.fn().mockResolvedValue(costSheet) },
      buyerDocument: { findMany: jest.fn().mockResolvedValue(verifiedDocs) },
      unitStatusHistory: { create: jest.fn().mockResolvedValue({}) },
      bookingStatusHistoryEntry: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn().mockImplementation((fn: any) => fn(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingConfirmationService,
        { provide: PrismaService, useValue: prisma },
        { provide: TimelineService, useValue: { add: jest.fn() } },
        { provide: AuditLogsService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get(BookingConfirmationService);
  });

  const applicants = [{ name: 'Ravi Kumar', role: 'PRIMARY' as const }];

  it('confirms when hold, cost sheet, and documents all pass', async () => {
    const result = await service.confirm(tenantId, 'booking-1', { applicants, bookingAmountPaise: 500000, actorId: 'manager-1' });
    expect(result.status).toBe('CONFIRMED');
    expect(result.bookingNumber).toMatch(/^BK-/);
  });

  it('is idempotent — confirming an already-CONFIRMED booking is a no-op', async () => {
    prisma.booking.findFirst.mockResolvedValue({ ...booking, status: 'CONFIRMED' });
    const result = await service.confirm(tenantId, 'booking-1', { applicants, bookingAmountPaise: 500000 });
    expect(prisma.unit.updateMany).not.toHaveBeenCalled();
    expect(result.status).toBe('CONFIRMED');
  });

  it('blocks with HOLD_EXPIRED when there is no active hold and no override', async () => {
    prisma.unitHold.findFirst.mockResolvedValue(null);
    await expect(
      service.confirm(tenantId, 'booking-1', { applicants, bookingAmountPaise: 500000 }),
    ).rejects.toMatchObject({ response: expect.objectContaining({ code: 'HOLD_EXPIRED' }) });
  });

  it('allows a manager override when there is no active hold', async () => {
    prisma.unitHold.findFirst.mockResolvedValue(null);
    const result = await service.confirm(tenantId, 'booking-1', { applicants, bookingAmountPaise: 500000, overrideMissingHold: true });
    expect(result.status).toBe('CONFIRMED');
  });

  it('blocks with DOCUMENTS_INCOMPLETE when a required document is not verified', async () => {
    prisma.buyerDocument.findMany.mockResolvedValue([{ type: 'PAN', status: 'UPLOADED' }]);
    await expect(
      service.confirm(tenantId, 'booking-1', { applicants, bookingAmountPaise: 500000 }),
    ).rejects.toMatchObject({ response: expect.objectContaining({ code: 'DOCUMENTS_INCOMPLETE' }) });
  });

  it('blocks with APPROVAL_REQUIRED when the cost sheet is not approved', async () => {
    prisma.costSheet.findUniqueOrThrow.mockResolvedValue({ ...costSheet, status: 'DRAFT' });
    await expect(
      service.confirm(tenantId, 'booking-1', { applicants, bookingAmountPaise: 500000 }),
    ).rejects.toMatchObject({ response: expect.objectContaining({ code: 'APPROVAL_REQUIRED' }) });
  });

  it('blocks with UNIT_NOT_AVAILABLE when the unit was claimed by someone else', async () => {
    prisma.unit.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.confirm(tenantId, 'booking-1', { applicants, bookingAmountPaise: 500000 }),
    ).rejects.toMatchObject({ response: expect.objectContaining({ code: 'UNIT_NOT_AVAILABLE' }) });
  });

  it('refuses to confirm without a recorded booking amount', async () => {
    await expect(
      service.confirm(tenantId, 'booking-1', { applicants, bookingAmountPaise: 0 }),
    ).rejects.toMatchObject({ response: expect.objectContaining({ code: 'APPROVAL_REQUIRED' }) });
  });

  it('refuses to cancel a booking that was never confirmed', async () => {
    await expect(service.cancel(tenantId, 'booking-1', 'buyer withdrew', 'manager-1')).rejects.toThrow(ForbiddenException);
  });

  it('releases the unit back to AVAILABLE when a confirmed booking is cancelled', async () => {
    prisma.booking.findFirst.mockResolvedValue({ ...booking, status: 'CONFIRMED' });
    prisma.unit.findUnique = jest.fn().mockResolvedValue({ ...unit, status: 'BOOKED' });
    prisma.unit.update = jest.fn().mockResolvedValue({});
    await service.cancel(tenantId, 'booking-1', 'buyer withdrew', 'manager-1');
    expect(prisma.unit.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'AVAILABLE' }) }),
    );
  });
});

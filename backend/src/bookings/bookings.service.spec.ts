import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConversionsService } from '../conversions/conversions.service';
import { CalendlyAdapter, GoogleCalendarAdapter } from '../shared/adapters/calendar.adapter';

describe('BookingsService', () => {
  let service: BookingsService;
  let prisma: any;
  const conversions = { createForLead: jest.fn().mockResolvedValue({}) };
  const calendly = { createBookingLink: jest.fn(), getAvailability: jest.fn(), cancelEvent: jest.fn(), rescheduleEvent: jest.fn() };
  const googleCal = { createBookingLink: jest.fn(), getAvailability: jest.fn(), cancelEvent: jest.fn(), rescheduleEvent: jest.fn() };

  const activeBooking = {
    id: 'bk-1', leadId: 'lead-1', bookingSettingId: 'set-1', provider: 'google',
    bookingType: 'Consultation', status: 'SCHEDULED', externalEventId: 'evt-1', link: 'https://example.com', metadata: {},
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma = {
      lead: { findUnique: jest.fn().mockResolvedValue({ id: 'lead-1', contact: { name: 'Jane' } }) },
      bookingSetting: { findFirst: jest.fn().mockResolvedValue({ id: 'set-1', provider: 'google', config: {} }), findUnique: jest.fn().mockResolvedValue({ id: 'set-1', provider: 'google', config: {} }) },
      booking: {
        create: jest.fn().mockResolvedValue({ ...activeBooking, id: 'bk-new' }),
        findFirst: jest.fn().mockResolvedValue(activeBooking),
        findMany: jest.fn().mockResolvedValue([activeBooking]),
        update: jest.fn().mockResolvedValue({ ...activeBooking, status: 'CANCELLED' }),
      },
      $transaction: jest.fn(async (fn: any) => fn(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConversionsService, useValue: conversions },
        { provide: CalendlyAdapter, useValue: calendly },
        { provide: GoogleCalendarAdapter, useValue: googleCal },
      ],
    }).compile();
    service = module.get<BookingsService>(BookingsService);
  });

  it('creates a booking and records a conversion', async () => {
    googleCal.createBookingLink.mockResolvedValue({ link: 'https://meet.example.com' });
    const result = await service.bookForLead('lead-1', 'Consultation');
    expect(result.id).toBe('bk-new');
    expect(conversions.createForLead).toHaveBeenCalledWith('lead-1', expect.objectContaining({ destination: 'APPOINTMENT_BOOKING' }));
  });

  it('throws when no active booking provider is configured', async () => {
    prisma.bookingSetting.findFirst.mockResolvedValue(null);
    await expect(service.bookForLead('lead-1', 'Consultation')).rejects.toThrow('No active booking provider configured');
  });

  it('reschedules by superseding the active booking', async () => {
    googleCal.rescheduleEvent.mockResolvedValue({ ok: true, scheduledAt: '2026-08-01T10:00:00.000Z' });
    const result = await service.reschedule('lead-1', '2026-08-01T10:00:00.000Z', 'lead asked to move');
    expect(googleCal.rescheduleEvent).toHaveBeenCalled();
    expect(prisma.booking.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'bk-1' } }));
    expect(prisma.booking.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ previousBookingId: 'bk-1', status: 'SCHEDULED' }) }));
    expect(result.id).toBe('bk-new');
  });

  it('rejects reschedule when there is no active booking', async () => {
    prisma.booking.findFirst.mockResolvedValue(null);
    await expect(service.reschedule('lead-1', '2026-08-01T10:00:00.000Z')).rejects.toThrow(BadRequestException);
  });

  it('cancels locally even when the provider cancel call fails', async () => {
    googleCal.cancelEvent.mockResolvedValue({ ok: false, error: 'provider down' });
    const result = await service.cancel('lead-1', 'no longer interested');
    expect(result.status).toBe('CANCELLED');
    expect(prisma.booking.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'bk-1' },
      data: expect.objectContaining({ status: 'CANCELLED' }),
    }));
  });
});

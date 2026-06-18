import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BookingSettingsService } from './booking-settings.service';
import { PrismaService } from '../prisma/prisma.service';
import { CalendlyAdapter, GoogleCalendarAdapter } from '../shared/adapters/calendar.adapter';

describe('BookingSettingsService', () => {
  let service: BookingSettingsService;
  let prisma: any;
  let calendly: any;
  let google: any;

  const mockSetting = { id: 'bs-1', name: 'Calendly', provider: 'calendly', config: { apiKey: 'test' } };

  beforeEach(async () => {
    prisma = {
      bookingSetting: {
        findMany: jest.fn().mockResolvedValue([mockSetting]),
        findUnique: jest.fn().mockResolvedValue(mockSetting),
        create: jest.fn().mockResolvedValue(mockSetting),
        update: jest.fn().mockResolvedValue(mockSetting),
        count: jest.fn().mockResolvedValue(1),
      },
    };
    calendly = { healthCheck: jest.fn().mockResolvedValue(true) };
    google = { healthCheck: jest.fn().mockResolvedValue(false) };

    const module = await Test.createTestingModule({
      providers: [
        BookingSettingsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CalendlyAdapter, useValue: calendly },
        { provide: GoogleCalendarAdapter, useValue: google },
      ],
    }).compile();
    service = module.get<BookingSettingsService>(BookingSettingsService);
  });

  it('should test Calendly and return healthy', async () => {
    const result = await service.test('bs-1');
    expect(result.healthy).toBe(true);
    expect(result.test).toBe('success');
    expect(calendly.healthCheck).toHaveBeenCalled();
  });

  it('should test Google Calendar and return unhealthy', async () => {
    prisma.bookingSetting.findUnique.mockResolvedValue({ ...mockSetting, provider: 'google' });
    const result = await service.test('bs-1');
    expect(result.healthy).toBe(false);
    expect(result.test).toBe('failed');
  });

  it('should throw on non-existent setting', async () => {
    prisma.bookingSetting.findUnique.mockResolvedValue(null);
    await expect(service.test('missing')).rejects.toThrow(NotFoundException);
  });
});

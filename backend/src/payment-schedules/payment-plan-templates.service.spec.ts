import { Test, TestingModule } from '@nestjs/testing';
import { PaymentPlanTemplatesService } from './payment-plan-templates.service';
import { PaymentSchedulesService } from './payment-schedules.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('PaymentPlanTemplatesService', () => {
  let service: PaymentPlanTemplatesService;
  let prisma: any;
  let paymentSchedules: any;

  const tenantId = 't1';
  const template = {
    id: 'tpl-1', tenantId, name: 'Construction Linked', planType: 'CONSTRUCTION_LINKED',
    milestones: [
      { label: 'Booking', percentage: 10, dueOffsetDays: 0 },
      { label: 'Foundation', percentage: 20, triggerNote: 'On foundation completion' },
      { label: 'Possession', percentage: 70, triggerNote: 'On possession' },
    ],
  };

  beforeEach(async () => {
    prisma = {
      paymentPlanTemplate: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'tpl-1', ...data })),
        findFirst: jest.fn().mockResolvedValue(template),
        findMany: jest.fn().mockResolvedValue([template]),
        update: jest.fn().mockResolvedValue({ ...template, active: false }),
      },
    };
    paymentSchedules = { create: jest.fn().mockImplementation((data) => Promise.resolve({ id: 'ps-x', ...data })) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentPlanTemplatesService,
        { provide: PrismaService, useValue: prisma },
        { provide: PaymentSchedulesService, useValue: paymentSchedules },
      ],
    }).compile();

    service = module.get(PaymentPlanTemplatesService);
  });

  it('refuses to create a template whose milestone percentages do not sum to 100', async () => {
    await expect(
      service.create(tenantId, { name: 'Bad', planType: 'CUSTOM' as any, milestones: [{ label: 'A', percentage: 50 }] }),
    ).rejects.toThrow(BadRequestException);
  });

  it('creates a valid template', async () => {
    const t = await service.create(tenantId, { name: 'Construction Linked', planType: 'CONSTRUCTION_LINKED' as any, milestones: template.milestones as any });
    expect(t.name).toBe('Construction Linked');
  });

  it('generates a payment schedule proportional to the total amount', async () => {
    const result = await service.generateSchedule(tenantId, { templateId: 'tpl-1', leadId: 'lead-1', bookingId: 'booking-1', totalAmount: 1000000 });
    expect(result).toHaveLength(3);
    expect(paymentSchedules.create).toHaveBeenNthCalledWith(1, expect.objectContaining({ amount: 100000, label: 'Booking' }));
    expect(paymentSchedules.create).toHaveBeenNthCalledWith(2, expect.objectContaining({ amount: 200000, label: 'Foundation (On foundation completion)' }));
  });

  it('leaves construction-linked milestones without a due date, relying on manual trigger', async () => {
    await service.generateSchedule(tenantId, { templateId: 'tpl-1', leadId: 'lead-1', bookingId: 'booking-1', totalAmount: 1000000 });
    const foundationCall = paymentSchedules.create.mock.calls[1][0];
    expect(foundationCall.dueDate).toBeUndefined();
  });

  it('throws when generating from a template that does not exist', async () => {
    prisma.paymentPlanTemplate.findFirst.mockResolvedValue(null);
    await expect(
      service.generateSchedule(tenantId, { templateId: 'nope', leadId: 'lead-1', bookingId: 'booking-1', totalAmount: 100 }),
    ).rejects.toThrow(NotFoundException);
  });
});

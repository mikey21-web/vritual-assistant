import { Test, TestingModule } from '@nestjs/testing';
import { TeamOpsService } from './team-ops.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('TeamOpsService', () => {
  let service: TeamOpsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      leaveRequest: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'lr-1', ...data })),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'lr-1', ...data })),
        count: jest.fn().mockResolvedValue(0),
      },
      user: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([{ id: 'u-1', name: 'Alice', monthlySalary: 50000, salaryType: 'Monthly' }]),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'u-1', ...data })),
      },
      salaryRecord: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'sr-1', ...data })) },
      timesheetEntry: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'te-1', ...data })) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [TeamOpsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<TeamOpsService>(TeamOpsService);
  });

  describe('createLeaveRequest', () => {
    it('should reject a leave request when no team members exist', async () => {
      prisma.user.count.mockResolvedValue(0);
      await expect(service.createLeaveRequest({ userId: 'u-1', startDate: '2026-08-01', endDate: '2026-08-02' })).rejects.toThrow(BadRequestException);
    });

    it('should allow a leave request when team members exist', async () => {
      const lr = await service.createLeaveRequest({ userId: 'u-1', startDate: '2026-08-01', endDate: '2026-08-02' });
      expect(lr.id).toBe('lr-1');
    });
  });

  describe('listPayroll', () => {
    it('should sum monthly salaries across employees', async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: 'u-1', name: 'Alice', monthlySalary: 50000, salaryType: 'Monthly' },
        { id: 'u-2', name: 'Bob', monthlySalary: 30000, salaryType: 'Monthly' },
      ]);
      const payroll = await service.listPayroll();
      expect(payroll.totalMonthlyPayroll).toBe(80000);
      expect(payroll.onPayroll).toBe(2);
    });
  });
});

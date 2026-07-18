import { Test, TestingModule } from '@nestjs/testing';
import { ModulePermissionsService } from './module-permissions.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('ModulePermissionsService', () => {
  let service: ModulePermissionsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'u-1', tenantId: 'default-tenant' }) },
      modulePermission: {
        upsert: jest.fn().mockImplementation(({ create, update }) => Promise.resolve({ id: 'mp-1', ...create, ...update })),
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ModulePermissionsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<ModulePermissionsService>(ModulePermissionsService);
  });

  describe('listPresets', () => {
    it('should list all named presets, including the event-management and real-estate sets', () => {
      const presets = service.listPresets();
      expect(presets).toHaveLength(10);
      expect(presets.map(p => p.name)).toEqual(
        expect.arrayContaining([
          'Operations manager', 'Sales coordinator', 'Event coordinator', 'Finance manager', 'Operations staff',
          'Sales Agent', 'Sales Manager', 'Marketing Coordinator', 'Finance & Payments', 'Viewer',
        ]),
      );
    });
  });

  describe('applyPreset', () => {
    it('should throw BadRequestException for an unknown preset', async () => {
      await expect(service.applyPreset('u-1', 'Nonexistent Preset')).rejects.toThrow(BadRequestException);
    });

    it('should upsert one row per module grant in the preset', async () => {
      await service.applyPreset('u-1', 'Finance manager');
      // Finance manager grants all 9 modules
      expect(prisma.modulePermission.upsert).toHaveBeenCalledTimes(9);
      expect(prisma.modulePermission.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ create: expect.objectContaining({ module: 'ACCOUNTING', level: 'FULL_ACCESS' }) }),
      );
    });
  });

  describe('hasAccess', () => {
    it('should return false when no permission row exists (defaults to NO_ACCESS)', async () => {
      expect(await service.hasAccess('u-1', 'ACCOUNTING', 'VIEW_ONLY')).toBe(false);
    });

    it('should return true when the stored level meets the minimum', async () => {
      prisma.modulePermission.findUnique.mockResolvedValue({ level: 'FULL_ACCESS' });
      expect(await service.hasAccess('u-1', 'ACCOUNTING', 'EDIT')).toBe(true);
    });

    it('should return false when the stored level is below the minimum', async () => {
      prisma.modulePermission.findUnique.mockResolvedValue({ level: 'VIEW_ONLY' });
      expect(await service.hasAccess('u-1', 'ACCOUNTING', 'FULL_ACCESS')).toBe(false);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogsService } from './audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuditLogsService', () => {
  let service: AuditLogsService;
  let prisma: any;

  const mockAuditLog = {
    id: 'log-1',
    action: 'lead_created',
    entity: 'Lead',
    entityId: 'lead-1',
    userId: 'user-1',
    changes: null,
    metadata: null,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    user: { id: 'user-1', name: 'Test User', email: 'test@test.com' },
  };

  beforeEach(async () => {
    prisma = {
      auditLog: {
        create: jest.fn().mockResolvedValue(mockAuditLog),
        findMany: jest.fn().mockResolvedValue([mockAuditLog, { ...mockAuditLog, id: 'log-2', action: 'lead_updated' }]),
        count: jest.fn().mockResolvedValue(2),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AuditLogsService>(AuditLogsService);
  });

  describe('log', () => {
    it('should create an audit log entry', async () => {
      const log = await service.log('lead_created', 'Lead', 'lead-1', 'user-1');
      expect(log).not.toBeNull();
      expect(log!.action).toBe('lead_created');
      expect(log!.entity).toBe('Lead');
      expect(log!.entityId).toBe('lead-1');
      expect(log!.userId).toBe('user-1');
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: 'lead_created',
          entity: 'Lead',
          entityId: 'lead-1',
          userId: 'user-1',
          changes: undefined,
          metadata: undefined,
        },
      });
    });

    it('should create audit log with changes and metadata', async () => {
      const changes = { name: { old: 'Old', new: 'New' } };
      const metadata = { ip: '127.0.0.1' };
      await service.log('lead_updated', 'Lead', 'lead-1', 'user-1', changes, metadata);
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: 'lead_updated',
          entity: 'Lead',
          entityId: 'lead-1',
          userId: 'user-1',
          changes,
          metadata,
        },
      });
    });

    it('should create audit log without optional fields', async () => {
      await service.log('system_event', 'System');
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: 'system_event',
          entity: 'System',
          entityId: undefined,
          userId: undefined,
          changes: undefined,
          metadata: undefined,
        },
      });
    });

    it('should return null on P2003 foreign key constraint error', async () => {
      const fkError = new Error('Foreign key constraint failed');
      (fkError as any).code = 'P2003';
      prisma.auditLog.create.mockRejectedValue(fkError);
      const result = await service.log('lead_created', 'Lead', 'lead-1');
      expect(result).toBeNull();
    });

    it('should rethrow non-P2003 errors', async () => {
      const otherError = new Error('Database connection failed');
      (otherError as any).code = 'P1001';
      prisma.auditLog.create.mockRejectedValue(otherError);
      await expect(service.log('lead_created', 'Lead')).rejects.toThrow('Database connection failed');
    });

    it('should rethrow error without code property', async () => {
      prisma.auditLog.create.mockRejectedValue(new Error('Unexpected error'));
      await expect(service.log('lead_created', 'Lead')).rejects.toThrow('Unexpected error');
    });
  });

  describe('findAll', () => {
    it('should return paginated audit logs without filters', async () => {
      const result = await service.findAll({ page: 1, limit: 50 });
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(50);
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          skip: 0,
          take: 50,
        }),
      );
    });

    it('should filter by entity', async () => {
      await service.findAll({ entity: 'Lead' });
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { entity: 'Lead' },
        }),
      );
    });

    it('should filter by entityId', async () => {
      await service.findAll({ entityId: 'lead-1' });
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { entityId: 'lead-1' },
        }),
      );
    });

    it('should filter by userId', async () => {
      await service.findAll({ userId: 'user-1' });
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
        }),
      );
    });

    it('should combine multiple filters', async () => {
      await service.findAll({ entity: 'Lead', entityId: 'lead-1', userId: 'user-1' });
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { entity: 'Lead', entityId: 'lead-1', userId: 'user-1' },
        }),
      );
    });

    it('should include user relation in results', async () => {
      await service.findAll({});
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { user: { select: { id: true, name: true, email: true } } },
        }),
      );
    });

    it('should return empty array when no logs match', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);
      const result = await service.findAll({ entity: 'Nonexistent' });
      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { OutboxService } from '../shared/outbox.service';
import { DataPruningService } from '../automation/data-pruning.service';
import { FailuresService } from '../failures/failures.service';

// Minimal inline service so the spec tests all admin operations
import { Injectable } from '@nestjs/common';

@Injectable()
class AdminService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
    private outbox: OutboxService,
    private pruning: DataPruningService,
    private failures: FailuresService,
  ) {}

  async getUsers(query: { role?: string; page?: number; limit?: number } = {}) {
    const { role, page = 1, limit = 20 } = query;
    const where: any = {};
    if (role) where.role = role;
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { data, meta: { total, page, limit } };
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateUserRole(id: string, role: string, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (!['ADMIN', 'MANAGER', 'SALES_AGENT', 'OWNER'].includes(role)) {
      throw new BadRequestException('Invalid role');
    }
    const updated = await this.prisma.user.update({ where: { id }, data: { role: role as any } });
    await this.auditLogs.log('user_role_updated', 'User', id, adminId, { oldRole: user.role, newRole: role });
    return updated;
  }

  async deactivateUser(id: string, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    const updated = await this.prisma.user.update({ where: { id }, data: { active: false } });
    await this.auditLogs.log('user_deactivated', 'User', id, adminId);
    return updated;
  }

  async getSystemSettings() {
    const tenant = await this.prisma.tenant.findFirst({ where: { slug: 'default' } });
    return (tenant?.settings as any) || {};
  }

  async updateSystemSettings(settings: Record<string, any>, adminId: string) {
    const tenant = await this.prisma.tenant.findFirst({ where: { slug: 'default' } });
    if (!tenant) throw new NotFoundException('Default tenant not found');
    const current = (tenant.settings as any) || {};
    const merged = { ...current, ...settings };
    const updated = await this.prisma.tenant.update({
      where: { id: tenant.id },
      data: { settings: merged },
    });
    await this.auditLogs.log('settings_updated', 'Tenant', tenant.id, adminId, { changes: settings });
    return merged;
  }

  async drainOutbox(batchSize = 50) {
    return this.outbox.drain(batchSize);
  }

  async pruneData() {
    return this.pruning.pruneAll();
  }

  async listFailures(filters: { status?: string; type?: string } = {}) {
    return this.failures.getInbox(filters);
  }

  async retryFailure(id: string) {
    return this.failures.retry(id);
  }

  async resolveFailure(id: string) {
    return this.failures.resolve(id);
  }

  async getAuditLogs(query: { entity?: string; entityId?: string; userId?: string; page?: number; limit?: number } = {}) {
    return this.auditLogs.findAll(query);
  }
}

describe('AdminService', () => {
  let service: AdminService;
  let prisma: any;
  let auditLogs: any;
  let outbox: any;
  let pruning: any;
  let failures: any;

  const mockUsers = [
    { id: 'user-1', name: 'Alice', email: 'alice@test.com', role: 'OWNER', active: true, createdAt: new Date('2025-01-01') },
    { id: 'user-2', name: 'Bob', email: 'bob@test.com', role: 'SALES_AGENT', active: true, createdAt: new Date('2025-01-02') },
    { id: 'user-3', name: 'Charlie', email: 'charlie@test.com', role: 'ADMIN', active: false, createdAt: new Date('2025-01-03') },
  ];

  const mockTenant = {
    id: 'tenant-1',
    slug: 'default',
    name: 'Default',
    settings: { timezone: 'UTC', language: 'en', agentConfig: { toneStyle: 'professional' } },
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findMany: jest.fn().mockResolvedValue(mockUsers),
        findUnique: jest.fn().mockImplementation(({ where: { id } }) =>
          Promise.resolve(mockUsers.find(u => u.id === id) || null),
        ),
        update: jest.fn().mockImplementation(({ where: { id }, data }) =>
          Promise.resolve({ ...mockUsers.find(u => u.id === id), ...data }),
        ),
        count: jest.fn().mockResolvedValue(3),
      },
      tenant: {
        findFirst: jest.fn().mockResolvedValue(mockTenant),
        update: jest.fn().mockResolvedValue(mockTenant),
      },
    };

    auditLogs = {
      log: jest.fn().mockResolvedValue({}),
      findAll: jest.fn().mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 50 } }),
    };

    outbox = {
      drain: jest.fn().mockResolvedValue(10),
    };

    pruning = {
      pruneAll: jest.fn().mockResolvedValue({
        webhookEvents: 100,
        auditLogs: 50,
        outboxMessages: 25,
        failureRecords: 10,
        automationEvents: 75,
        scoreLogs: 30,
        timelineItems: 200,
      }),
    };

    failures = {
      getInbox: jest.fn().mockResolvedValue([{ id: 'fail-1', type: 'send_error', status: 'pending' }]),
      retry: jest.fn().mockResolvedValue({ id: 'fail-1', status: 'retrying' }),
      resolve: jest.fn().mockResolvedValue({ id: 'fail-1', status: 'resolved' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: auditLogs },
        { provide: OutboxService, useValue: outbox },
        { provide: DataPruningService, useValue: pruning },
        { provide: FailuresService, useValue: failures },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  // ── User Management ──────────────────────────────────────────────

  it('should list users with pagination', async () => {
    const result = await service.getUsers({ page: 1, limit: 10 });
    expect(result.data).toHaveLength(3);
    expect(result.meta.total).toBe(3);
    expect(result.meta.page).toBe(1);
    expect(result.meta.limit).toBe(10);
  });

  it('should filter users by role', async () => {
    await service.getUsers({ role: 'SALES_AGENT' });
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ role: 'SALES_AGENT' }),
      }),
    );
  });

  it('should find a user by id', async () => {
    const user = await service.getUser('user-1');
    expect(user.id).toBe('user-1');
    expect(user.name).toBe('Alice');
  });

  it('should throw NotFoundException when user not found', async () => {
    await expect(service.getUser('nonexistent')).rejects.toThrow(NotFoundException);
  });

  it('should update a user role', async () => {
    const updated = await service.updateUserRole('user-2', 'MANAGER', 'user-1');
    expect(updated.role).toBe('MANAGER');
    expect(auditLogs.log).toHaveBeenCalledWith('user_role_updated', 'User', 'user-2', 'user-1', expect.any(Object));
  });

  it('should throw BadRequestException for invalid role', async () => {
    await expect(service.updateUserRole('user-2', 'INVALID_ROLE', 'user-1')).rejects.toThrow(BadRequestException);
  });

  it('should throw NotFoundException when updating role of non-existent user', async () => {
    await expect(service.updateUserRole('nonexistent', 'MANAGER', 'user-1')).rejects.toThrow(NotFoundException);
  });

  it('should deactivate a user', async () => {
    const updated = await service.deactivateUser('user-1', 'admin-1');
    expect(updated.active).toBe(false);
    expect(auditLogs.log).toHaveBeenCalledWith('user_deactivated', 'User', 'user-1', 'admin-1');
  });

  it('should throw NotFoundException when deactivating non-existent user', async () => {
    await expect(service.deactivateUser('nonexistent', 'admin-1')).rejects.toThrow(NotFoundException);
  });

  // ── System Settings ──────────────────────────────────────────────

  it('should get system settings', async () => {
    const settings = await service.getSystemSettings();
    expect(settings).toEqual(mockTenant.settings);
  });

  it('should return empty object when no tenant exists', async () => {
    prisma.tenant.findFirst.mockResolvedValue(null);
    const settings = await service.getSystemSettings();
    expect(settings).toEqual({});
  });

  it('should update system settings merging with existing', async () => {
    const newSettings = { timezone: 'EST', maxLeadsPerDay: 100 };
    const result = await service.updateSystemSettings(newSettings, 'admin-1');
    expect(result.timezone).toBe('EST');
    expect(result.maxLeadsPerDay).toBe(100);
    expect(result.language).toBe('en'); // preserved from existing
    expect(auditLogs.log).toHaveBeenCalledWith('settings_updated', 'Tenant', 'tenant-1', 'admin-1', expect.any(Object));
  });

  it('should throw NotFoundException when updating settings with no tenant', async () => {
    prisma.tenant.findFirst.mockResolvedValue(null);
    await expect(service.updateSystemSettings({ timezone: 'EST' }, 'admin-1')).rejects.toThrow(NotFoundException);
  });

  // ── Outbox & Data Pruning ────────────────────────────────────────

  it('should drain the outbox', async () => {
    const processed = await service.drainOutbox(50);
    expect(processed).toBe(10);
    expect(outbox.drain).toHaveBeenCalledWith(50);
  });

  it('should prune old data', async () => {
    const results = await service.pruneData();
    expect(results.webhookEvents).toBe(100);
    expect(results.auditLogs).toBe(50);
    expect(pruning.pruneAll).toHaveBeenCalled();
  });

  // ── Failure Management ───────────────────────────────────────────

  it('should list failure records', async () => {
    const result = await service.listFailures({ status: 'pending' });
    expect(result).toHaveLength(1);
    expect(failures.getInbox).toHaveBeenCalledWith({ status: 'pending' });
  });

  it('should retry a failure', async () => {
    const result = await service.retryFailure('fail-1');
    expect(result.status).toBe('retrying');
    expect(failures.retry).toHaveBeenCalledWith('fail-1');
  });

  it('should resolve a failure', async () => {
    const result = await service.resolveFailure('fail-1');
    expect(result.status).toBe('resolved');
    expect(failures.resolve).toHaveBeenCalledWith('fail-1');
  });

  // ── Audit Logs ───────────────────────────────────────────────────

  it('should query audit logs', async () => {
    await service.getAuditLogs({ entity: 'User', page: 1, limit: 10 });
    expect(auditLogs.findAll).toHaveBeenCalledWith({ entity: 'User', page: 1, limit: 10 });
  });

  // ── Edge Cases ───────────────────────────────────────────────────

  it('should handle empty user list gracefully', async () => {
    prisma.user.findMany.mockResolvedValue([]);
    prisma.user.count.mockResolvedValue(0);
    const result = await service.getUsers();
    expect(result.data).toHaveLength(0);
    expect(result.meta.total).toBe(0);
  });

  it('should handle zero outbox drain result', async () => {
    outbox.drain.mockResolvedValue(0);
    const processed = await service.drainOutbox();
    expect(processed).toBe(0);
  });

  it('should handle prune with zero deletions', async () => {
    pruning.pruneAll.mockResolvedValue({
      webhookEvents: 0, auditLogs: 0, outboxMessages: 0, failureRecords: 0,
      automationEvents: 0, scoreLogs: 0, timelineItems: 0,
    });
    const results = await service.pruneData();
    expect(Object.values(results).every(v => v === 0)).toBe(true);
  });

  it('should return empty failure list when no failures exist', async () => {
    failures.getInbox.mockResolvedValue([]);
    const result = await service.listFailures();
    expect(result).toHaveLength(0);
  });
});

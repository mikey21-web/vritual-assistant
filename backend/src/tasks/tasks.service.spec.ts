import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('TasksService', () => {
  let service: TasksService;
  let prisma: any;

  const mockLead = { id: 'lead-1', contact: { name: 'John Doe' } };
  const mockAssignee = { id: 'user-1', name: 'Alice' };

  const mockTask = {
    id: 'task-1',
    title: 'Follow up call',
    description: 'Call John about the proposal',
    status: 'PENDING',
    dueDate: new Date('2025-02-01T00:00:00Z'),
    leadId: 'lead-1',
    assigneeId: 'user-1',
    tenantId: 'default-tenant',
    createdAt: new Date('2025-01-15T00:00:00Z'),
    updatedAt: new Date('2025-01-15T00:00:00Z'),
    lead: mockLead,
    assignee: mockAssignee,
  };

  const mockTasks = [
    mockTask,
    {
      ...mockTask,
      id: 'task-2',
      title: 'Send contract',
      status: 'COMPLETED',
      leadId: 'lead-2',
      assigneeId: 'user-2',
      lead: { id: 'lead-2', contact: { name: 'Jane Smith' } },
      assignee: { id: 'user-2', name: 'Bob' },
    },
  ];

  beforeEach(async () => {
    prisma = {
      task: {
        findMany: jest.fn().mockResolvedValue(mockTasks),
        findUnique: jest.fn().mockResolvedValue(mockTask),
        create: jest.fn().mockResolvedValue(mockTask),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ ...mockTask, ...data }),
        ),
        count: jest.fn().mockResolvedValue(mockTasks.length),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  describe('findAll', () => {
    it('should return paginated tasks with includes', async () => {
      const result = await service.findAll({ page: 1, limit: 20 });
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            lead: { select: { id: true, contact: { select: { name: true } } } },
            assignee: { select: { id: true, name: true } },
          },
        }),
      );
    });

    it('should filter by status', async () => {
      await service.findAll({ status: 'PENDING' });
      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'PENDING' }),
        }),
      );
    });

    it('should filter by assigneeId', async () => {
      await service.findAll({ assigneeId: 'user-1' });
      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ assigneeId: 'user-1' }),
        }),
      );
    });

    it('should filter by leadId', async () => {
      await service.findAll({ leadId: 'lead-1' });
      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ leadId: 'lead-1' }),
        }),
      );
    });

    it('should combine multiple filters', async () => {
      await service.findAll({ status: 'PENDING', assigneeId: 'user-1', leadId: 'lead-1' });
      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'PENDING', assigneeId: 'user-1', leadId: 'lead-1' },
        }),
      );
    });

    it('should use default pagination when no query provided', async () => {
      const result = await service.findAll();
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
    });

    it('should compute correct skip for page 2', async () => {
      await service.findAll({ page: 2, limit: 10 });
      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('should order tasks by createdAt descending', async () => {
      await service.findAll();
      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a task with lead and assignee included', async () => {
      const task = await service.findOne('task-1');
      expect(task.id).toBe('task-1');
      expect(task.lead).toBeDefined();
      expect(task.assignee).toBeDefined();
      expect(prisma.task.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'task-1' },
          include: { lead: true, assignee: true },
        }),
      );
    });

    it('should throw NotFoundException when task not found', async () => {
      prisma.task.findUnique.mockResolvedValue(null);
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a task', async () => {
      const task = await service.create({
        title: 'Follow up call',
        leadId: 'lead-1',
        assigneeId: 'user-1',
      });
      expect(task.title).toBe('Follow up call');
      expect(prisma.task.create).toHaveBeenCalledWith({
        data: { title: 'Follow up call', leadId: 'lead-1', assigneeId: 'user-1' },
      });
    });

    it('should create a task with all optional fields', async () => {
      const dueDate = new Date('2025-03-01T00:00:00Z');
      await service.create({
        title: 'Send email',
        description: 'Send the proposal document',
        status: 'IN_PROGRESS',
        dueDate,
        leadId: 'lead-1',
        assigneeId: 'user-2',
      });
      expect(prisma.task.create).toHaveBeenCalledWith({
        data: {
          title: 'Send email',
          description: 'Send the proposal document',
          status: 'IN_PROGRESS',
          dueDate,
          leadId: 'lead-1',
          assigneeId: 'user-2',
        },
      });
    });
  });

  describe('update', () => {
    it('should update an existing task', async () => {
      prisma.task.update.mockResolvedValue({ ...mockTask, status: 'COMPLETED' });
      const task = await service.update('task-1', { status: 'COMPLETED' });
      expect(task.status).toBe('COMPLETED');
      expect(prisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'task-1' },
          data: { status: 'COMPLETED' },
        }),
      );
    });

    it('should throw NotFoundException when updating a non-existent task', async () => {
      prisma.task.findUnique.mockResolvedValue(null);
      await expect(service.update('nonexistent', { status: 'COMPLETED' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should call findOne (which validates existence) before updating', async () => {
      await service.update('task-1', { title: 'Updated title' });
      expect(prisma.task.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'task-1' } }),
      );
    });
  });
});

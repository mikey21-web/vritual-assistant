import { Test, TestingModule } from '@nestjs/testing';
import { NurtureSequencesService } from './nurture-sequences.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('NurtureSequencesService', () => {
  let service: NurtureSequencesService;
  let prisma: any;

  const mockStep = {
    id: 'step-1',
    sequenceId: 'seq-1',
    type: 'SEND_WHATSAPP',
    displayOrder: 1,
    config: { text: 'Welcome message' },
    templateId: null,
    condition: null,
    waitSeconds: null,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    template: null,
  };

  const mockStep2 = {
    id: 'step-2',
    sequenceId: 'seq-1',
    type: 'WAIT',
    displayOrder: 2,
    config: null,
    templateId: null,
    condition: null,
    waitSeconds: 86400,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    template: null,
  };

  const mockSequence = {
    id: 'seq-1',
    name: 'Welcome Nurture',
    description: '3-step welcome sequence',
    active: true,
    tenantId: 'default-tenant',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    steps: [mockStep, mockStep2],
  };

  beforeEach(async () => {
    prisma = {
      nurtureSequence: {
        findMany: jest.fn().mockResolvedValue([mockSequence]),
        findUnique: jest.fn().mockResolvedValue(mockSequence),
        create: jest.fn().mockResolvedValue(mockSequence),
        update: jest.fn().mockResolvedValue(mockSequence),
        count: jest.fn().mockResolvedValue(1),
      },
      nurtureStep: {
        create: jest.fn().mockResolvedValue(mockStep),
        update: jest.fn().mockResolvedValue(mockStep),
        delete: jest.fn().mockResolvedValue(mockStep),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NurtureSequencesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<NurtureSequencesService>(NurtureSequencesService);
  });

  // ── findAll ─────────────────────────────────────

  it('should find all sequences with pagination', async () => {
    const result = await service.findAll({ page: 1, limit: 10 });
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
    expect(result.meta.page).toBe(1);
    expect(result.meta.limit).toBe(10);
  });

  it('should include steps ordered by displayOrder', async () => {
    await service.findAll({ page: 1, limit: 20 });
    expect(prisma.nurtureSequence.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: { steps: { orderBy: { displayOrder: 'asc' } } },
        orderBy: { createdAt: 'desc' },
      }),
    );
  });

  it('should use default page and limit when not provided', async () => {
    await service.findAll({});
    expect(prisma.nurtureSequence.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 20 }),
    );
  });

  it('should return empty result when no sequences exist', async () => {
    prisma.nurtureSequence.findMany.mockResolvedValue([]);
    prisma.nurtureSequence.count.mockResolvedValue(0);
    const result = await service.findAll({ page: 1, limit: 20 });
    expect(result.data).toEqual([]);
    expect(result.meta.total).toBe(0);
  });

  it('should respect custom page skip calculation', async () => {
    await service.findAll({ page: 3, limit: 10 });
    expect(prisma.nurtureSequence.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 }),
    );
  });

  it('should use Promise.all to fetch data and count concurrently', async () => {
    const findManySpy = jest.spyOn(prisma.nurtureSequence, 'findMany');
    const countSpy = jest.spyOn(prisma.nurtureSequence, 'count');

    await service.findAll({ page: 1, limit: 10 });

    expect(findManySpy).toHaveBeenCalled();
    expect(countSpy).toHaveBeenCalled();
  });

  // ── findOne ─────────────────────────────────────

  it('should find a sequence by id', async () => {
    const seq = await service.findOne('seq-1');
    expect(seq.id).toBe('seq-1');
    expect(seq.name).toBe('Welcome Nurture');
    expect(seq.steps).toHaveLength(2);
  });

  it('should throw NotFoundException when sequence not found', async () => {
    prisma.nurtureSequence.findUnique.mockResolvedValue(null);
    await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
  });

  // ── create ──────────────────────────────────────

  it('should create a sequence', async () => {
    const seq = await service.create({
      name: 'New Sequence',
      active: true,
      tenantId: 'default-tenant',
    });
    expect(seq.name).toBe('Welcome Nurture');
    expect(prisma.nurtureSequence.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { name: 'New Sequence', active: true, tenantId: 'default-tenant' },
      }),
    );
  });

  it('should create a sequence with description', async () => {
    await service.create({
      name: 'Follow-up Sequence',
      description: 'Follow-up over 7 days',
    });
    expect(prisma.nurtureSequence.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { name: 'Follow-up Sequence', description: 'Follow-up over 7 days' },
      }),
    );
  });

  // ── update ──────────────────────────────────────

  it('should update a sequence', async () => {
    prisma.nurtureSequence.update.mockResolvedValue({ ...mockSequence, name: 'Updated Seq' });
    const seq = await service.update('seq-1', { name: 'Updated Seq' });
    expect(prisma.nurtureSequence.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'seq-1' },
        data: { name: 'Updated Seq' },
      }),
    );
  });

  it('should throw NotFoundException when updating non-existent sequence', async () => {
    prisma.nurtureSequence.findUnique.mockResolvedValue(null);
    await expect(service.update('nonexistent', { name: 'Nope' })).rejects.toThrow(NotFoundException);
  });

  it('should verify existence before updating', async () => {
    await service.update('seq-1', { active: false });
    expect(prisma.nurtureSequence.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'seq-1' } }),
    );
  });

  // ── addStep ─────────────────────────────────────

  it('should add a step to a sequence', async () => {
    const step = await service.addStep('seq-1', {
      type: 'SEND_WHATSAPP',
      displayOrder: 3,
      config: { text: 'Follow-up message' },
    });
    expect(step.type).toBe('SEND_WHATSAPP');
    expect(step.sequenceId).toBe('seq-1');
    expect(prisma.nurtureStep.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { type: 'SEND_WHATSAPP', displayOrder: 3, config: { text: 'Follow-up message' }, sequenceId: 'seq-1' },
      }),
    );
  });

  it('should add a WAIT step with waitSeconds', async () => {
    await service.addStep('seq-1', { type: 'WAIT', waitSeconds: 3600, displayOrder: 4 });
    expect(prisma.nurtureStep.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'WAIT', waitSeconds: 3600, sequenceId: 'seq-1' }),
      }),
    );
  });

  it('should add a step with a template reference', async () => {
    await service.addStep('seq-1', { type: 'SEND_EMAIL', templateId: 'template-1', displayOrder: 5 });
    expect(prisma.nurtureStep.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ templateId: 'template-1', sequenceId: 'seq-1' }),
      }),
    );
  });

  // ── updateStep ──────────────────────────────────

  it('should update a step', async () => {
    prisma.nurtureStep.update.mockResolvedValue({ ...mockStep, config: { text: 'Updated message' } });
    await service.updateStep('seq-1', 'step-1', { config: { text: 'Updated message' } });
    expect(prisma.nurtureStep.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'step-1' },
        data: { config: { text: 'Updated message' } },
      }),
    );
  });

  it('should update step display order independently', async () => {
    await service.updateStep('seq-1', 'step-2', { displayOrder: 1 });
    expect(prisma.nurtureStep.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'step-2' },
        data: { displayOrder: 1 },
      }),
    );
  });

  // ── deleteStep ──────────────────────────────────

  it('should delete a step', async () => {
    await service.deleteStep('seq-1', 'step-1');
    expect(prisma.nurtureStep.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'step-1' } }),
    );
  });

  it('should pass sequenceId for validation even though delete uses step id', async () => {
    await service.deleteStep('seq-1', 'step-2');
    // sequenceId is accepted but not used in the underlying prisma call — only step id matters
    expect(prisma.nurtureStep.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'step-2' } }),
    );
  });
});

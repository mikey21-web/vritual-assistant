import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CustomFieldsService } from './custom-fields.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CustomFieldsService', () => {
  let service: CustomFieldsService;
  let prisma: any;

  const mockDefinition = {
    id: 'def-1',
    name: 'Company Size',
    key: 'company_size',
    type: 'TEXT',
    model: 'lead',
    displayOrder: 1,
    required: false,
    options: null,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
  };

  const mockDefinition2 = {
    id: 'def-2',
    name: 'Budget Range',
    key: 'budget_range',
    type: 'SELECT',
    model: 'lead',
    displayOrder: 2,
    required: true,
    options: ['low', 'medium', 'high'],
    createdAt: new Date('2025-01-02T00:00:00Z'),
    updatedAt: new Date('2025-01-02T00:00:00Z'),
  };

  const mockValue = {
    id: 'val-1',
    definitionId: 'def-1',
    leadId: 'lead-1',
    contactId: null,
    value: 'Enterprise',
    definition: mockDefinition,
  };

  beforeEach(async () => {
    prisma = {
      customFieldDefinition: {
        findMany: jest.fn().mockResolvedValue([mockDefinition, mockDefinition2]),
        count: jest.fn().mockResolvedValue(2),
        create: jest.fn().mockResolvedValue(mockDefinition),
        findUnique: jest.fn().mockResolvedValue(mockDefinition),
        update: jest.fn().mockResolvedValue(mockDefinition),
        delete: jest.fn().mockResolvedValue({}),
      },
      customFieldValue: {
        findMany: jest.fn().mockResolvedValue([mockValue]),
        upsert: jest.fn().mockResolvedValue(mockValue),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomFieldsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CustomFieldsService>(CustomFieldsService);
  });

  // ─── findAllDefinitions ─────────────────────────────────────────

  it('should find all definitions with pagination', async () => {
    const result = await service.findAllDefinitions({ page: 1, limit: 10 });

    expect(result.data).toHaveLength(2);
    expect(result.meta.total).toBe(2);
    expect(result.meta.page).toBe(1);
    expect(result.meta.limit).toBe(10);
    expect(prisma.customFieldDefinition.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 10,
        orderBy: { displayOrder: 'asc' },
      }),
    );
  });

  it('should apply default pagination when not specified', async () => {
    await service.findAllDefinitions({});

    expect(prisma.customFieldDefinition.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 50 }),
    );
  });

  it('should order definitions by displayOrder ascending', async () => {
    await service.findAllDefinitions({ page: 1, limit: 50 });

    expect(prisma.customFieldDefinition.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { displayOrder: 'asc' } }),
    );
  });

  // ─── createDefinition ─────────────────────────────────────────

  it('should create a new definition', async () => {
    const data = {
      name: 'Industry',
      key: 'industry',
      type: 'TEXT',
      model: 'contact',
      displayOrder: 3,
    };

    prisma.customFieldDefinition.create.mockResolvedValue({
      ...mockDefinition,
      id: 'def-3',
      name: 'Industry',
      key: 'industry',
    });

    const result = await service.createDefinition(data);

    expect(prisma.customFieldDefinition.create).toHaveBeenCalledWith({ data });
    expect(result.name).toBe('Industry');
  });

  it('should create definition with options for SELECT type', async () => {
    const data = {
      name: 'Priority',
      key: 'priority',
      type: 'SELECT',
      model: 'lead',
      options: ['high', 'medium', 'low'],
      displayOrder: 4,
    };

    await service.createDefinition(data);

    expect(prisma.customFieldDefinition.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        options: ['high', 'medium', 'low'],
      }),
    });
  });

  // ─── updateDefinition ─────────────────────────────────────────

  it('should update an existing definition', async () => {
    const updatedDef = { ...mockDefinition, name: 'Updated Name' };
    prisma.customFieldDefinition.update.mockResolvedValue(updatedDef);

    const result = await service.updateDefinition('def-1', { name: 'Updated Name' });

    expect(prisma.customFieldDefinition.findUnique).toHaveBeenCalledWith({ where: { id: 'def-1' } });
    expect(prisma.customFieldDefinition.update).toHaveBeenCalledWith({
      where: { id: 'def-1' },
      data: { name: 'Updated Name' },
    });
    expect(result.name).toBe('Updated Name');
  });

  it('should throw NotFoundException when updating non-existent definition', async () => {
    prisma.customFieldDefinition.findUnique.mockResolvedValue(null);

    await expect(
      service.updateDefinition('nonexistent', { name: 'Nope' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should update only provided fields on a definition', async () => {
    const result = await service.updateDefinition('def-1', { required: true });

    expect(prisma.customFieldDefinition.update).toHaveBeenCalledWith({
      where: { id: 'def-1' },
      data: { required: true },
    });
  });

  // ─── removeDefinition ─────────────────────────────────────────

  it('should soft-delete a definition', async () => {
    prisma.customFieldDefinition.findUnique.mockResolvedValue({ id: 'def-1', active: true });
    prisma.customFieldDefinition.update.mockResolvedValue({ id: 'def-1', active: false });

    const result = await service.removeDefinition('def-1');

    expect(prisma.customFieldDefinition.findUnique).toHaveBeenCalledWith({ where: { id: 'def-1' } });
    expect(prisma.customFieldDefinition.update).toHaveBeenCalledWith({
      where: { id: 'def-1' },
      data: { active: false },
    });
  });

  it('should throw when removing non-existent definition', async () => {
    prisma.customFieldDefinition.findUnique.mockResolvedValue(null);

    await expect(service.removeDefinition('nonexistent')).rejects.toThrow();
  });

  // ─── getValues ──────────────────────────────────────────────────

  it('should get field values for a lead', async () => {
    const result = await service.getValues('lead', 'lead-1');

    expect(prisma.customFieldValue.findMany).toHaveBeenCalledWith({
      where: { leadId: 'lead-1' },
      include: { definition: true },
    });
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe('Enterprise');
  });

  it('should get field values for a contact', async () => {
    await service.getValues('contact', 'contact-1');

    expect(prisma.customFieldValue.findMany).toHaveBeenCalledWith({
      where: { contactId: 'contact-1' },
      include: { definition: true },
    });
  });

  it('should include definition details in field values', async () => {
    const result = await service.getValues('lead', 'lead-1');

    expect(result[0].definition).toBeDefined();
    expect(result[0].definition.name).toBe('Company Size');
    expect(result[0].definition.type).toBe('TEXT');
  });

  it('should return empty array when no values exist for target', async () => {
    prisma.customFieldValue.findMany.mockResolvedValue([]);

    const result = await service.getValues('lead', 'lead-no-values');
    expect(result).toEqual([]);
  });

  // ─── setValues ──────────────────────────────────────────────────

  it('should set values for a lead via upsert', async () => {
    const newValue = { ...mockValue, value: 'Startup' };
    prisma.customFieldValue.upsert.mockResolvedValue(newValue);

    const result = await service.setValues('lead', 'lead-1', [
      { definitionId: 'def-1', value: 'Startup' },
    ]);

    expect(prisma.customFieldValue.upsert).toHaveBeenCalledWith({
      where: { definitionId_leadId: { definitionId: 'def-1', leadId: 'lead-1' } },
      update: { value: 'Startup' },
      create: { definitionId: 'def-1', value: 'Startup', leadId: 'lead-1' },
    });
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe('Startup');
  });

  it('should set values for a contact via upsert', async () => {
    const result = await service.setValues('contact', 'contact-1', [
      { definitionId: 'def-2', value: 'High' },
    ]);

    expect(prisma.customFieldValue.upsert).toHaveBeenCalledWith({
      where: { definitionId_contactId: { definitionId: 'def-2', contactId: 'contact-1' } },
      update: { value: 'High' },
      create: { definitionId: 'def-2', value: 'High', contactId: 'contact-1' },
    });
  });

  it('should handle multiple values in setValues', async () => {
    const val1 = { ...mockValue, value: 'A' };
    const val2 = { ...mockValue, id: 'val-2', value: 'B', definitionId: 'def-2' };
    prisma.customFieldValue.upsert
      .mockResolvedValueOnce(val1)
      .mockResolvedValueOnce(val2);

    const result = await service.setValues('lead', 'lead-1', [
      { definitionId: 'def-1', value: 'A' },
      { definitionId: 'def-2', value: 'B' },
    ]);

    expect(prisma.customFieldValue.upsert).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
    expect(result[0].value).toBe('A');
    expect(result[1].value).toBe('B');
  });

  it('should update existing value when definitionId already has a value', async () => {
    const existing = { ...mockValue, value: 'Small Biz' };
    prisma.customFieldValue.upsert.mockResolvedValue(existing);

    const result = await service.setValues('lead', 'lead-1', [
      { definitionId: 'def-1', value: 'Small Biz' },
    ]);

    expect(prisma.customFieldValue.upsert).toHaveBeenCalledWith({
      where: { definitionId_leadId: { definitionId: 'def-1', leadId: 'lead-1' } },
      update: { value: 'Small Biz' },
      create: { definitionId: 'def-1', value: 'Small Biz', leadId: 'lead-1' },
    });
    expect(result[0].value).toBe('Small Biz');
  });

  it('should handle empty values array', async () => {
    const result = await service.setValues('lead', 'lead-1', []);

    expect(prisma.customFieldValue.upsert).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('should handle upsert errors gracefully', async () => {
    prisma.customFieldValue.upsert.mockRejectedValue(new Error('Unique constraint failed'));

    await expect(
      service.setValues('lead', 'lead-1', [
        { definitionId: 'def-1', value: 'Error value' },
      ]),
    ).rejects.toThrow();
  });
});

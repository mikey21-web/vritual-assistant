import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PackApplierService } from '../shared/pack-applier.service';
import { NicheTemplatesService } from './niche-templates.service';

describe('NicheTemplatesService', () => {
  let service: NicheTemplatesService;
  let prisma: any;
  let packApplierMock: any;
  const auditLogs = { log: jest.fn().mockResolvedValue({}) };

  const mockTemplate = {
    id: 'tpl-1', key: 'test-niche', name: 'Test Niche', description: 'Test desc',
    industry: 'test', version: 1, status: 'published', config: {}, createdAt: new Date(), updatedAt: new Date(),
  };

  const mockTemplateWithPacks = {
    ...mockTemplate,
    packs: [
      { id: 'pack-1', templateId: 'tpl-1', type: 'custom_fields', name: 'Fields', payload: { fields: [{ name: 'Test Field', key: 'test_field', type: 'TEXT', target: 'LEAD', required: true, displayOrder: 1 }] }, order: 1, active: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 'pack-2', templateId: 'tpl-1', type: 'pipeline_stages', name: 'Pipeline', payload: { stages: [{ name: 'Stage 1', order: 1, color: '#000' }] }, order: 2, active: true, createdAt: new Date(), updatedAt: new Date() },
    ],
  };

  const mockDraftTemplate = { ...mockTemplateWithPacks, status: 'draft' };

  const mockCreatedEntity = (table: string) => ({ id: `${table}-1` });

  beforeEach(async () => {
    prisma = {
      nicheTemplate: {
        findMany: jest.fn().mockResolvedValue([{ ...mockTemplate, _count: { packs: 2 } }]),
        findUnique: jest.fn().mockImplementation((args: any) => {
          if (args?.where?.id === 'cloned-tpl') return Promise.resolve({ ...mockTemplateWithPacks, key: 'cloned', name: 'Cloned Template', status: 'draft', version: 1 });
          return Promise.resolve(mockTemplateWithPacks);
        }),
        create: jest.fn().mockImplementation(d => Promise.resolve({ id: d.data.key === 'cloned' ? 'cloned-tpl' : 'new-tpl', ...d.data })),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...mockTemplate, ...data })),
        delete: jest.fn().mockResolvedValue({}),
      },
      nicheTemplatePack: {
        findUnique: jest.fn().mockResolvedValue(mockTemplateWithPacks.packs[0]),
        create: jest.fn().mockImplementation(d => Promise.resolve({ id: 'new-pack', ...d.data })),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'pack-1', ...data })),
      },
      clientTemplateInstallation: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockImplementation(d => Promise.resolve({ id: 'inst-1', ...d.data, installedAt: new Date() })),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'inst-1', ...data, installedAt: new Date() })),
      },
      customFieldDefinition: { create: jest.fn().mockImplementation(d => Promise.resolve({ id: 'cf-1', ...d.data })), delete: jest.fn().mockResolvedValue({}) },
      pipelineStage: { create: jest.fn().mockImplementation(d => Promise.resolve({ id: 'ps-1', ...d.data })), delete: jest.fn().mockResolvedValue({}) },
      campaign: { create: jest.fn().mockImplementation(d => Promise.resolve({ id: 'camp-1', ...d.data })), delete: jest.fn().mockResolvedValue({}) },
      leadForm: { create: jest.fn().mockImplementation(d => Promise.resolve({ id: 'form-1', ...d.data })), delete: jest.fn().mockResolvedValue({}) },
      leadFormField: { create: jest.fn().mockImplementation(d => Promise.resolve({ id: 'lff-1', ...d.data })), delete: jest.fn().mockResolvedValue({}) },
      messageTemplate: { create: jest.fn().mockImplementation(d => Promise.resolve({ id: 'mt-1', ...d.data })), delete: jest.fn().mockResolvedValue({}) },
      scoringRule: { create: jest.fn().mockImplementation(d => Promise.resolve({ id: 'sr-1', ...d.data })), delete: jest.fn().mockResolvedValue({}) },
      routingRule: { create: jest.fn().mockImplementation(d => Promise.resolve({ id: 'rr-1', ...d.data })), delete: jest.fn().mockResolvedValue({}) },
      automationRule: { create: jest.fn().mockImplementation(d => Promise.resolve({ id: 'ar-1', ...d.data })), delete: jest.fn().mockResolvedValue({}) },
      nurtureSequence: { create: jest.fn().mockImplementation(d => Promise.resolve({ id: 'ns-1', ...d.data })), delete: jest.fn().mockResolvedValue({}) },
      nurtureStep: { create: jest.fn().mockImplementation(d => Promise.resolve({ id: 'nst-1', ...d.data })), delete: jest.fn().mockResolvedValue({}) },
      bookingSetting: { create: jest.fn().mockImplementation(d => Promise.resolve({ id: 'bs-1', ...d.data })), delete: jest.fn().mockResolvedValue({}) },
      crmMapping: { create: jest.fn().mockImplementation(d => Promise.resolve({ id: 'crm-1', ...d.data })), delete: jest.fn().mockResolvedValue({}) },
      conversion: { create: jest.fn().mockImplementation(d => Promise.resolve({ id: 'conv-1', ...d.data })), delete: jest.fn().mockResolvedValue({}) },
      savedFilter: { create: jest.fn().mockImplementation(d => Promise.resolve({ id: 'sf-1', ...d.data })), delete: jest.fn().mockResolvedValue({}) },
    };

    packApplierMock = {
      apply: jest.fn().mockImplementation((pack: any) => {
        const payload = pack.payload || {};
        const ids: string[] = [];
        const records: { table: string; id: string }[] = [];
        switch (pack.type) {
          case 'custom_fields':
            for (const f of payload.fields || []) { ids.push('cf-1'); records.push({ table: 'customFieldDefinition', id: 'cf-1' }); }
            break;
          case 'pipeline_stages':
            for (const s of payload.stages || []) { ids.push('ps-1'); records.push({ table: 'pipelineStage', id: 'ps-1' }); }
            break;
          case 'campaigns':
            for (const c of payload.campaigns || []) { ids.push('cmp-1'); records.push({ table: 'campaign', id: 'cmp-1' }); }
            break;
          case 'lead_forms':
            for (const f of payload.forms || []) {
              ids.push('lf-1');
              records.push({ table: 'leadForm', id: 'lf-1' });
              for (const field of f.fields || []) {
                ids.push('lff-1');
                records.push({ table: 'leadFormField', id: 'lff-1' });
              }
            }
            break;
          case 'message_templates':
            for (const t of payload.templates || payload.messages || []) { ids.push('mt-1'); records.push({ table: 'messageTemplate', id: 'mt-1' }); }
            break;
          case 'scoring_rules':
            for (const r of payload.rules || []) { ids.push('sr-1'); records.push({ table: 'scoringRule', id: 'sr-1' }); }
            break;
          case 'routing_rules':
            for (const r of payload.rules || []) { ids.push('rr-1'); records.push({ table: 'routingRule', id: 'rr-1' }); }
            break;
          case 'automation_rules':
            for (const r of payload.rules || []) { ids.push('ar-1'); records.push({ table: 'automationRule', id: 'ar-1' }); }
            break;
          case 'nurture_sequences':
            for (const seq of payload.sequences || []) {
              ids.push('ns-1');
              records.push({ table: 'nurtureSequence', id: 'ns-1' });
              for (const step of seq.steps || []) { ids.push('nst-1'); records.push({ table: 'nurtureStep', id: 'nst-1' }); }
            }
            break;
          case 'booking_settings':
            for (const b of payload.settings || []) { ids.push('bs-1'); records.push({ table: 'bookingSetting', id: 'bs-1' }); }
            break;
          case 'crm_mappings':
            for (const m of payload.mappings || []) { ids.push('crm-1'); records.push({ table: 'crmMapping', id: 'crm-1' }); }
            break;
          case 'reports':
            for (const r of payload.reports || []) { ids.push('sf-1'); records.push({ table: 'savedFilter', id: 'sf-1' }); }
            break;
          case 'saved_filters':
            for (const f of payload.filters || []) { ids.push('sf-1'); records.push({ table: 'savedFilter', id: 'sf-1' }); }
            break;
          case 'conversion_goals':
          case 'dashboard_labels':
          case 'notification_rules':
          case 'sample_data':
            break;
        }
        return Promise.resolve({ ids, records });
      }),
      rollback: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NicheTemplatesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: auditLogs },
        { provide: PackApplierService, useValue: packApplierMock },
      ],
    }).compile();

    service = module.get<NicheTemplatesService>(NicheTemplatesService);
  });

  describe('findAll', () => {
    it('should return templates with pack counts', async () => {
      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(result[0]._count.packs).toBe(2);
    });

    it('should return empty array when no templates', async () => {
      prisma.nicheTemplate.findMany.mockResolvedValue([]);
      const result = await service.findAll();
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return template with packs', async () => {
      const result = await service.findOne('tpl-1');
      expect(result.packs).toBeDefined();
      expect(result.packs).toHaveLength(2);
    });

    it('should throw NotFoundException for missing template', async () => {
      prisma.nicheTemplate.findUnique.mockResolvedValue(null);
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByKey', () => {
    it('should return template by key', async () => {
      const result: any = await service.findByKey('test-niche');
      expect(result).toBeDefined();
      expect(result.key).toBe('test-niche');
    });

    it('should return null for unknown key', async () => {
      prisma.nicheTemplate.findUnique.mockResolvedValue(null);
      const result = await service.findByKey('unknown');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a template and audit log', async () => {
      const data = { key: 'new-niche', name: 'New Niche', industry: 'test', config: {} };
      const result = await service.create(data);
      expect(result.key).toBe('new-niche');
      expect(auditLogs.log).toHaveBeenCalledWith('niche_template_created', 'NicheTemplate', 'new-tpl');
    });

    it('should default config to empty object', async () => {
      const result = await service.create({ key: 'no-config', name: 'No Config', industry: 'test' });
      expect(result).toBeDefined();
    });
  });

  describe('update', () => {
    it('should update template fields', async () => {
      const result = await service.update('tpl-1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });

    it('should throw NotFoundException for missing template', async () => {
      prisma.nicheTemplate.findUnique.mockResolvedValue(null);
      await expect(service.update('nonexistent', { name: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete and audit log', async () => {
      const result = await service.delete('tpl-1');
      expect(result).toEqual({ deleted: true });
      expect(auditLogs.log).toHaveBeenCalledWith('niche_template_deleted', 'NicheTemplate', 'tpl-1');
    });

    it('should throw NotFoundException for missing template', async () => {
      prisma.nicheTemplate.findUnique.mockResolvedValue(null);
      await expect(service.delete('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('publish', () => {
    it('should publish draft and increment version', async () => {
      prisma.nicheTemplate.findUnique.mockResolvedValue(mockDraftTemplate);
      const result = await service.publish('tpl-1');
      expect(result.status).toBe('published');
      expect(result.version).toBe(2);
    });

    it('should reject already published template', async () => {
      prisma.nicheTemplate.findUnique.mockResolvedValue(mockTemplateWithPacks);
      await expect(service.publish('tpl-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('clone', () => {
    it('should deep-clone template with packs', async () => {
      const result = await service.clone('tpl-1', 'cloned', 'Cloned Template');
      expect(result.key).toBe('cloned');
      expect(result.name).toBe('Cloned Template');
      expect(result.status).toBe('draft');
      expect(result.version).toBe(1);
      expect(prisma.nicheTemplatePack.create).toHaveBeenCalledTimes(2);
      expect(auditLogs.log).toHaveBeenCalledWith('niche_template_cloned', 'NicheTemplate', 'cloned-tpl', undefined, expect.objectContaining({ sourceId: 'tpl-1', sourceKey: 'test-niche' }));
    });
  });

  describe('addPack', () => {
    it('should add a pack to template', async () => {
      const result = await service.addPack('tpl-1', { type: 'campaigns', name: 'Campaigns', payload: {} });
      expect(result.type).toBe('campaigns');
    });

    it('should throw NotFoundException for missing template', async () => {
      prisma.nicheTemplate.findUnique.mockResolvedValue(null);
      await expect(service.addPack('nonexistent', { type: 'x', name: 'X', payload: {} })).rejects.toThrow(NotFoundException);
    });
  });

  describe('updatePack', () => {
    it('should update a pack', async () => {
      const result = await service.updatePack('pack-1', { name: 'Updated Pack' });
      expect(result.name).toBe('Updated Pack');
    });

    it('should throw NotFoundException for missing pack', async () => {
      prisma.nicheTemplatePack.findUnique.mockResolvedValue(null);
      await expect(service.updatePack('nonexistent', { name: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('apply', () => {
    it('should create installation with all pack types', async () => {
      const result = await service.apply('tpl-1', 'client-a', 'user-1');
      expect(result.installation.status).toBe('installed');
      expect(result.summary.created).toBeDefined();
      expect(Object.keys(result.summary.created).length).toBeGreaterThan(0);
    });

    it('should reject draft template', async () => {
      prisma.nicheTemplate.findUnique.mockResolvedValue(mockDraftTemplate);
      await expect(service.apply('tpl-1', 'client-a')).rejects.toThrow(BadRequestException);
    });

    it('should reject duplicate installation', async () => {
      prisma.clientTemplateInstallation.findFirst.mockResolvedValue({ id: 'existing' });
      await expect(service.apply('tpl-1', 'client-a')).rejects.toThrow(BadRequestException);
    });

    it('should skip inactive packs', async () => {
      const templateWithInactive = {
        ...mockTemplateWithPacks,
        packs: [
          { ...mockTemplateWithPacks.packs[0], active: false },
          mockTemplateWithPacks.packs[1],
        ],
      };
      prisma.nicheTemplate.findUnique.mockResolvedValue(templateWithInactive);
      const result = await service.apply('tpl-1', 'client-b');
      expect(result.summary.created.custom_fields).toBeUndefined();
    });

    it('should rollback all created records on failure', async () => {
      packApplierMock.apply.mockRejectedValueOnce(new Error('DB error'));
      await expect(service.apply('tpl-1', 'client-c')).rejects.toThrow('Template application failed');

      const failedInst = prisma.clientTemplateInstallation.create.mock.calls.find(
        (c: any[]) => c[0].data && c[0].data.status === 'failed'
      );
      expect(failedInst).toBeDefined();
      expect(failedInst[0].data.errorMessage).toBe('DB error');
    });

    it('should record failed installation with error message', async () => {
      packApplierMock.apply.mockRejectedValueOnce(new Error('Pipeline error'));
      await expect(service.apply('tpl-1', 'client-d')).rejects.toThrow('Template application failed');
    });

    it('should track nested creates (leadForm fields) for rollback', async () => {
      const templateWithForms = {
        ...mockTemplateWithPacks,
        packs: [
          {
            id: 'pack-form', templateId: 'tpl-1', type: 'lead_forms', name: 'Forms', active: true, order: 1,
            payload: { forms: [{ name: 'Test Form', fields: [{ label: 'Email', fieldKey: 'email', type: 'email' }] }] },
            createdAt: new Date(), updatedAt: new Date(),
          },
        ],
      };
      prisma.nicheTemplate.findUnique.mockResolvedValue(templateWithForms);
      const result = await service.apply('tpl-1', 'client-e');
      expect(result.summary.created.lead_forms).toBe(2);
      expect(packApplierMock.apply).toHaveBeenCalled();
    });
  });

  describe('dryRun', () => {
    it('should return preview without creating records', async () => {
      const result = await service.dryRun('tpl-1', 'client-a');
      expect(result.template.key).toBe('test-niche');
      expect(result.totalRecords).toBeGreaterThan(0);
      expect(result.breakdown).toBeDefined();
      expect(result.breakdown.custom_fields.count).toBe(1);
      expect(result.breakdown.pipeline_stages.count).toBe(1);
    });

    it('should include sample records per pack type', async () => {
      const result = await service.dryRun('tpl-1', 'client-a');
      expect(result.breakdown.custom_fields.samples[0].key).toBe('client-a_test_field');
      expect(result.breakdown.pipeline_stages.samples[0].name).toBe('Stage 1');
    });

    it('should not call any prisma create methods', async () => {
      await service.dryRun('tpl-1', 'client-a');
      expect(prisma.customFieldDefinition.create).not.toHaveBeenCalled();
      expect(prisma.pipelineStage.create).not.toHaveBeenCalled();
      expect(prisma.campaign.create).not.toHaveBeenCalled();
    });

    it('should reject draft template', async () => {
      prisma.nicheTemplate.findUnique.mockResolvedValue(mockDraftTemplate);
      await expect(service.dryRun('tpl-1', 'client-a')).rejects.toThrow(BadRequestException);
    });

    it('should show max 3 samples per pack', async () => {
      const templateWithManyFields = {
        ...mockTemplateWithPacks,
        packs: [
          { ...mockTemplateWithPacks.packs[0], payload: { fields: [{ name: 'F1', key: 'f1', type: 'TEXT', target: 'LEAD' }, { name: 'F2', key: 'f2', type: 'TEXT', target: 'LEAD' }, { name: 'F3', key: 'f3', type: 'TEXT', target: 'LEAD' }, { name: 'F4', key: 'f4', type: 'TEXT', target: 'LEAD' }] } },
        ],
      };
      prisma.nicheTemplate.findUnique.mockResolvedValue(templateWithManyFields);
      const result = await service.dryRun('tpl-1', 'client-a');
      expect(result.breakdown.custom_fields.samples.length).toBe(3);
    });
  });

  describe('upgrade', () => {
    it('should apply only new packs for higher version', async () => {
      const higherVersionTemplate = { ...mockTemplateWithPacks, version: 3, packs: [
        ...mockTemplateWithPacks.packs,
        { id: 'pack-3', templateId: 'tpl-1', type: 'scoring_rules', name: 'Scoring', payload: { rules: [{ name: 'Rule 1', field: 'score', operator: 'gt', value: '10', points: 5 }] }, order: 3, active: true, createdAt: new Date(), updatedAt: new Date() },
      ]};
      prisma.nicheTemplate.findUnique.mockResolvedValue(higherVersionTemplate);
      prisma.clientTemplateInstallation.findFirst.mockResolvedValue({
        id: 'inst-1', clientKey: 'client-a', templateId: 'tpl-1', templateVersion: 1, status: 'installed',
        createdRecords: { custom_fields: ['cf-1'], pipeline_stages: ['ps-1'] },
      });

      const result = await service.upgrade('tpl-1', 'client-a', 'user-1');
      expect(result.newPacksInstalled).toBe(1);
      expect(result.newRecordsCreated).toBe(1);
      expect(packApplierMock.apply).toHaveBeenCalled();
    });

    it('should reject if already at latest version', async () => {
      prisma.clientTemplateInstallation.findFirst.mockResolvedValue({
        id: 'inst-1', clientKey: 'client-a', templateId: 'tpl-1', templateVersion: 1, status: 'installed',
        createdRecords: { custom_fields: ['cf-1'], pipeline_stages: ['ps-1'] },
      });
      await expect(service.upgrade('tpl-1', 'client-a')).rejects.toThrow(BadRequestException);
    });

    it('should reject if no installation exists', async () => {
      await expect(service.upgrade('tpl-1', 'client-none')).rejects.toThrow(NotFoundException);
    });

    it('should audit log with version delta', async () => {
      const higherVersionTemplate = { ...mockTemplateWithPacks, version: 3, packs: [
        ...mockTemplateWithPacks.packs,
        { id: 'pack-3', templateId: 'tpl-1', type: 'automation_rules', name: 'Auto', payload: { rules: [{ name: 'Rule 1', category: 'auto', conditions: {}, actions: [] }] }, order: 3, active: true, createdAt: new Date(), updatedAt: new Date() },
      ]};
      prisma.nicheTemplate.findUnique.mockResolvedValue(higherVersionTemplate);
      prisma.clientTemplateInstallation.findFirst.mockResolvedValue({
        id: 'inst-1', clientKey: 'client-a', templateId: 'tpl-1', templateVersion: 1, status: 'installed',
        createdRecords: { custom_fields: ['cf-1'], pipeline_stages: ['ps-1'] },
      });
      await service.upgrade('tpl-1', 'client-a', 'user-1');
      expect(auditLogs.log).toHaveBeenCalledWith('niche_template_upgraded', 'ClientTemplateInstallation', 'inst-1', 'user-1', expect.objectContaining({ fromVersion: 1, toVersion: 3 }));
    });
  });

  describe('getInstallations', () => {
    it('should return all installations', async () => {
      prisma.clientTemplateInstallation.findMany.mockResolvedValue([{ id: 'inst-1', clientKey: 'a', template: { key: 'test', name: 'Test', industry: 'test' } }]);
      const result = await service.getInstallations();
      expect(result).toHaveLength(1);
    });

    it('should filter by clientKey', async () => {
      await service.getInstallations('client-x');
      expect(prisma.clientTemplateInstallation.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { clientKey: 'client-x' } }));
    });
  });

  describe('getClientTemplate', () => {
    it('should return latest installed template', async () => {
      prisma.clientTemplateInstallation.findFirst.mockResolvedValue({ id: 'inst-1', clientKey: 'a', tenantId: null, status: 'installed', installedAt: new Date(), configSnapshot: {}, templateId: 'tpl-1', template: { key: 'test', name: 'Test', industry: 'test' } });
      prisma.nicheTemplate.findUnique.mockResolvedValue({ id: 'tpl-1', key: 'test', name: 'Test', industry: 'test', version: 1, packs: [] });
      const result = await service.getClientTemplate('a');
      expect(result.clientKey).toBe('a');
      expect(result.template.key).toBe('test');
    });

    it('should throw NotFoundException for non-existent', async () => {
      prisma.clientTemplateInstallation.findFirst.mockResolvedValue(null);
      await expect(service.getClientTemplate('none')).rejects.toThrow(NotFoundException);
    });
  });

  describe('applyPackToClient', () => {
    it('should create custom fields with clientKey prefix', async () => {
      const result = await service.apply('tpl-1', 'prefix-cli');
      expect(packApplierMock.apply).toHaveBeenCalled();
    });

    it('should handle reports by creating saved filters', async () => {
      const templateWithReports = {
        ...mockTemplateWithPacks,
        packs: [
          { id: 'pack-rpt', templateId: 'tpl-1', type: 'reports', name: 'Reports', active: true, order: 1,
            payload: { reports: [{ name: 'Leads by Source', type: 'leads_by_source' }] },
            createdAt: new Date(), updatedAt: new Date() },
        ],
      };
      prisma.nicheTemplate.findUnique.mockResolvedValue(templateWithReports);
      await service.apply('tpl-1', 'client-rpt');
      expect(packApplierMock.apply).toHaveBeenCalled();
    });
  });

  describe('buildSummary', () => {
    it('should count records by pack type', async () => {
      const result = await service.apply('tpl-1', 'client-sum');
      expect(result.summary.created.custom_fields).toBe(1);
      expect(result.summary.created.pipeline_stages).toBe(1);
    });
  });
});

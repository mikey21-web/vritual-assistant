import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type StepStatus = 'not_started' | 'in_progress' | 'blocked' | 'complete';

export interface StepResult {
  key: string;
  title: string;
  status: StepStatus;
  detail: string;
}

/**
 * Each step has an explicit validator against real data, not a self-reported
 * checkbox — "inventory complete" means units actually exist with valid
 * status, "WhatsApp complete" means a connected integration exists, etc.
 * (spec 54.2). Progress is also persisted to TenantOnboardingStep so support
 * can see exactly where a tenant is stuck without re-running every check.
 */
@Injectable()
export class OnboardingService {
  constructor(private prisma: PrismaService) {}

  async getProgress(tenantId: string): Promise<StepResult[]> {
    const [tenant, projectCount, userCount, unitCount, whatsappIntegration, connectedIntegrations, templateCount, leadCount] = await Promise.all([
      this.prisma.tenant.findUnique({ where: { id: tenantId } }),
      this.prisma.project.count({ where: { tenantId } }),
      this.prisma.user.count({ where: { tenantId } }),
      this.prisma.unit.count({ where: { tenantId } }),
      this.prisma.integration.findFirst({ where: { tenantId, type: { contains: 'whatsapp', mode: 'insensitive' }, status: 'connected' } }),
      this.prisma.integration.findMany({ where: { tenantId, status: 'connected' } }),
      this.prisma.messageTemplate.count({ where: { creator: { tenantId } } }),
      this.prisma.lead.count({ where: { tenantId } }),
    ]);
    const nonWhatsappIntegration = connectedIntegrations.find((i) => !i.type.toLowerCase().includes('whatsapp'));

    const steps: StepResult[] = [
      {
        key: 'company', title: 'Company and timezone',
        status: tenant?.name ? 'complete' : 'not_started',
        detail: tenant?.name ? `Company: ${tenant.name}` : 'Set company name in Settings',
      },
      {
        key: 'projects', title: 'Projects and RERA/bank data',
        status: projectCount > 0 ? 'complete' : 'not_started',
        detail: `${projectCount} project(s) created`,
      },
      {
        key: 'team', title: 'Team',
        status: userCount > 1 ? 'complete' : 'in_progress',
        detail: `${userCount} team member(s)`,
      },
      {
        key: 'inventory', title: 'Inventory import',
        status: unitCount > 0 ? 'complete' : 'not_started',
        detail: `${unitCount} unit(s) imported`,
      },
      {
        key: 'whatsapp', title: 'WhatsApp integration',
        status: whatsappIntegration ? 'complete' : 'not_started',
        detail: whatsappIntegration ? 'Connected and tested' : 'No connected WhatsApp integration yet',
      },
      {
        key: 'leadSources', title: 'Lead sources',
        status: nonWhatsappIntegration ? 'complete' : 'not_started',
        detail: nonWhatsappIntegration ? `Connected: ${nonWhatsappIntegration.name}` : 'No connected lead source yet',
      },
      {
        key: 'templates', title: 'Message templates',
        status: templateCount > 0 ? 'complete' : 'not_started',
        detail: `${templateCount} template(s) created`,
      },
      {
        key: 'testLead', title: 'Test lead',
        status: leadCount > 0 ? 'complete' : 'not_started',
        detail: `${leadCount} lead(s) in the system`,
      },
    ];

    const required = steps.filter((s) => s.key !== 'team');
    const goLive: StepResult = {
      key: 'goLive', title: 'Go-live check',
      status: required.every((s) => s.status === 'complete') ? 'complete' : 'blocked',
      detail: required.every((s) => s.status === 'complete')
        ? 'All required steps complete'
        : `Waiting on: ${required.filter((s) => s.status !== 'complete').map((s) => s.title).join(', ')}`,
    };

    return [...steps, goLive];
  }

  async recordStep(tenantId: string, stepKey: string, status: StepStatus, actorId?: string) {
    return this.prisma.tenantOnboardingStep.upsert({
      where: { tenantId_stepKey: { tenantId, stepKey } },
      update: { status, completedAt: status === 'complete' ? new Date() : null, completedById: actorId },
      create: { tenantId, stepKey, status, completedAt: status === 'complete' ? new Date() : null, completedById: actorId },
    });
  }
}

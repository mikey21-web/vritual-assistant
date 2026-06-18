import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { eventMarketingAgencyTemplate } from './templates/event-marketing-agency.template';
import { realEstateTemplate } from './templates/real-estate.template';
import {
  educationCoachingTemplate, healthcareClinicTemplate, b2bAgencyTemplate,
  financeInsuranceTemplate, legalFirmTemplate, travelAgencyTemplate,
  homeImprovementTemplate, automotiveDealerTemplate, franchiseSalesTemplate, saasDemoTemplate,
} from './templates/all-templates';

const ALL_TEMPLATES = [
  eventMarketingAgencyTemplate,
  realEstateTemplate,
  educationCoachingTemplate,
  healthcareClinicTemplate,
  b2bAgencyTemplate,
  financeInsuranceTemplate,
  legalFirmTemplate,
  travelAgencyTemplate,
  homeImprovementTemplate,
  automotiveDealerTemplate,
  franchiseSalesTemplate,
  saasDemoTemplate,
];

@Injectable()
export class NicheTemplateSeeder {
  private readonly logger = new Logger(NicheTemplateSeeder.name);

  constructor(private prisma: PrismaService) {}

  async seed() {
    let created = 0, skipped = 0;
    for (const tmpl of ALL_TEMPLATES) {
      const existing = await this.prisma.nicheTemplate.findUnique({ where: { key: tmpl.key } });
      if (existing) { skipped++; continue; }

      const record = await this.prisma.nicheTemplate.create({
        data: {
          key: tmpl.key,
          name: tmpl.name,
          description: tmpl.description || null,
          industry: (tmpl as any).industry || 'general',
          version: (tmpl as any).version || 1,
          status: 'published',
          config: {},
        },
      });

      let order = 0;
      for (const [type, pack] of Object.entries(tmpl.packs)) {
        order++;
        await this.prisma.nicheTemplatePack.create({
          data: { templateId: record.id, type: (pack as any).type || type, name: (pack as any).name || type, payload: (pack as any).payload || pack, order, active: true },
        });
      }
      created++;
    }
    this.logger.log(`Seeded ${created} templates, skipped ${skipped} existing`);
    return { created, skipped };
  }
}

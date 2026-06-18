import { PrismaClient } from '@prisma/client';
import { eventMarketingAgencyTemplate } from '../src/niche-templates/templates/event-marketing-agency.template';
import { realEstateTemplate } from '../src/niche-templates/templates/real-estate.template';
import {
  educationCoachingTemplate, healthcareClinicTemplate, b2bAgencyTemplate,
  financeInsuranceTemplate, legalFirmTemplate, travelAgencyTemplate,
  homeImprovementTemplate, automotiveDealerTemplate, franchiseSalesTemplate, saasDemoTemplate,
} from '../src/niche-templates/templates/all-templates';

const prisma = new PrismaClient();

const ALL_TEMPLATES = [
  eventMarketingAgencyTemplate, realEstateTemplate,
  educationCoachingTemplate, healthcareClinicTemplate, b2bAgencyTemplate,
  financeInsuranceTemplate, legalFirmTemplate, travelAgencyTemplate,
  homeImprovementTemplate, automotiveDealerTemplate, franchiseSalesTemplate, saasDemoTemplate,
];

async function main() {
  let created = 0, skipped = 0;
  for (const tmpl of ALL_TEMPLATES) {
    const existing = await prisma.nicheTemplate.findUnique({ where: { key: tmpl.key } });
    if (existing) { skipped++; continue; }

    const record = await prisma.nicheTemplate.create({
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
      await prisma.nicheTemplatePack.create({
        data: {
          templateId: record.id,
          type: (pack as any).type || type,
          name: (pack as any).name || type,
          payload: (pack as any).payload || pack,
          order,
          active: true,
        },
      });
    }
    created++;
  }
  console.log(`Seeded ${created} templates, skipped ${skipped} existing`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());

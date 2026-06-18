import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { AdvancedFeaturesService } from './advanced-features.service';

@Processor('sla-evaluator')
export class SlaProcessor extends WorkerHost {
  constructor(private advanced: AdvancedFeaturesService, private prisma: PrismaService) {
    super();
  }

  async process(): Promise<any> {
    const result = await this.advanced.evaluateSlaRules();
    const escalated = result.breaches.filter(b => b.escalationNeeded);
    for (const breach of escalated) {
      await this.prisma.task.create({
        data: {
          title: `SLA Breach: ${breach.slaRuleName} — Lead ${breach.leadName || breach.leadId}`,
          priority: 'high',
          leadId: breach.leadId,
          assigneeId: breach.escalationUserId || undefined,
        },
      }).catch(err => {
        console.error(`SLA task creation failed for lead ${breach.leadId}: ${err.message}`);
      });
    }
    return { evaluatedAt: result.evaluatedAt, breachCount: result.breaches.length, escalatedCount: escalated.length };
  }
}

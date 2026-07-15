import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { NicheFinding } from './niche-scanner.service';

@Injectable()
export class NicheActionService {
  private readonly logger = new Logger(NicheActionService.name);

  constructor(private prisma: PrismaService) {}

  async execute(finding: NicheFinding): Promise<{ executed: boolean; result?: string }> {
    const action = finding.metadata?.suggestedAction;
    if (!action) return { executed: false, result: 'no action defined' };

    try {
      switch (action) {
        case 'create_followup_tasks': {
          const leadIds: string[] = finding.metadata?.leadIds || [];
          let count = 0;
          for (const leadId of leadIds) {
            await this.prisma.task.create({
              data: {
                leadId,
                title: finding.metadata?.taskTitle || 'Follow up',
                priority: finding.severity === 'critical' ? '1' : '3',
                status: 'pending',
              },
            });
            count++;
          }
          return { executed: true, result: `Created ${count} follow-up task(s)` };
        }

        case 'notify_staff': {
          this.logger.warn(`[STAFF_NOTIFY] ${finding.title}: ${finding.description}`);
          return { executed: true, result: 'Staff notified via log' };
        }

        case 'escalate_critical': {
          this.logger.error(`[ESCALATE] ${finding.title}: ${finding.description}`);
          return { executed: true, result: 'Escalated to senior staff' };
        }

        default:
          return { executed: false, result: `unknown action: ${action}` };
      }
    } catch (err: any) {
      this.logger.error(`Action execution failed: ${err.message}`);
      return { executed: false, result: `error: ${err.message}` };
    }
  }
}

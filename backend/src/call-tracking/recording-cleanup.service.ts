import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class RecordingCleanupService {
  private readonly logger = new Logger(RecordingCleanupService.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldRecordings() {
    this.logger.log('Running recording cleanup job...');

    const tenants = await this.prisma.tenant.findMany({
      where: { active: true },
      select: { id: true, settings: true },
    });

    for (const tenant of tenants) {
      const settings = tenant.settings as any;
      const retentionDays = settings?.recordingRetentionDays;
      if (!retentionDays || retentionDays < 1) continue;

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - retentionDays);

      const oldCalls = await this.prisma.callLog.findMany({
        where: {
          tenantId: tenant.id,
          recordingUrl: { not: null },
          createdAt: { lt: cutoff },
        },
        select: { id: true, recordingUrl: true },
      });

      for (const call of oldCalls) {
        if (call.recordingUrl) {
          const filePath = path.resolve(
            process.env.STORAGE_PATH || './uploads',
            call.recordingUrl.replace(/^\//, ''),
          );
          try {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          } catch (err: any) {
            this.logger.warn(`Failed to delete recording ${filePath}: ${err.message}`);
          }
        }
      }

      if (oldCalls.length > 0) {
        await this.prisma.callLog.updateMany({
          where: { id: { in: oldCalls.map(c => c.id) } },
          data: { recordingUrl: null, recordedLocally: false },
        });
        this.logger.log(`Tenant ${tenant.id}: cleaned ${oldCalls.length} recordings older than ${retentionDays} days`);
      }
    }
  }
}

import { Module } from '@nestjs/common';
import { SiteVisitsService } from './site-visits.service';
import { SiteVisitsController } from './site-visits.controller';
import { AutomationModule } from '../automation/automation.module';
import { NoShowRecoveryService } from './no-show-recovery.service';

@Module({
  imports: [AutomationModule],
  controllers: [SiteVisitsController],
  providers: [SiteVisitsService, NoShowRecoveryService],
  exports: [SiteVisitsService, NoShowRecoveryService],
})
export class SiteVisitsModule {}

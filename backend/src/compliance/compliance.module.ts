import { Module } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { ComplianceController } from './compliance.controller';
import { GdprService } from './gdpr.service';
import { GdprController } from './gdpr.controller';

@Module({
  controllers: [ComplianceController, GdprController],
  providers: [ComplianceService, GdprService],
  exports: [ComplianceService, GdprService],
})
export class ComplianceModule {}

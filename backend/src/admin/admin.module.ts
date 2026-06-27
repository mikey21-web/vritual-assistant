import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { ImpersonationController } from './impersonation.controller';
import { AutomationModule } from '../automation/automation.module';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [AutomationModule, SharedModule],
  controllers: [AdminController, ImpersonationController],
  exports: [],
})
export class AdminModule {}

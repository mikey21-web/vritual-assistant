import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { AdvancedFeaturesModule } from '../advanced-features/advanced-features.module';

@Module({
  imports: [AdvancedFeaturesModule],
  controllers: [LeadsController],
  providers: [LeadsService],
  exports: [LeadsService],
})
export class LeadsModule {}

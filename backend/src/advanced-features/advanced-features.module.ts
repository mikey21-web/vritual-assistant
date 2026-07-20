import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AdvancedFeaturesService } from './advanced-features.service';
import { AdvancedFeaturesController } from './advanced-features.controller';
import { SlaProcessor } from './sla.processor';
import { SlaCronService } from './sla-cron.service';
import { ContactsModule } from '../contacts/contacts.module';
import { SlaModule } from '../sla/sla.module';

@Module({
  imports: [BullModule.registerQueue({ name: 'sla-evaluator' }), forwardRef(() => ContactsModule), SlaModule],
  controllers: [AdvancedFeaturesController],
  providers: [AdvancedFeaturesService, SlaProcessor, SlaCronService],
  exports: [AdvancedFeaturesService],
})
export class AdvancedFeaturesModule {}

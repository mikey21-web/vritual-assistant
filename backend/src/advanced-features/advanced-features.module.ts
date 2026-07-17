import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AdvancedFeaturesService } from './advanced-features.service';
import { AdvancedFeaturesController } from './advanced-features.controller';
import { SlaProcessor } from './sla.processor';
import { ContactsModule } from '../contacts/contacts.module';

@Module({
  imports: [BullModule.registerQueue({ name: 'sla-evaluator' }), forwardRef(() => ContactsModule)],
  controllers: [AdvancedFeaturesController],
  providers: [AdvancedFeaturesService, SlaProcessor],
  exports: [AdvancedFeaturesService],
})
export class AdvancedFeaturesModule {}

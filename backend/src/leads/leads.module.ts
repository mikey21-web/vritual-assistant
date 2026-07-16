import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { AdvancedFeaturesModule } from '../advanced-features/advanced-features.module';
import { ContactsModule } from '../contacts/contacts.module';

@Module({
  imports: [AdvancedFeaturesModule, ContactsModule],
  controllers: [LeadsController],
  providers: [LeadsService],
  exports: [LeadsService],
})
export class LeadsModule {}

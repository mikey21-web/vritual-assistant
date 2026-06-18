import { Module } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { ContactsController } from './contacts.controller';
import { AdvancedFeaturesModule } from '../advanced-features/advanced-features.module';

@Module({
  imports: [AdvancedFeaturesModule],
  controllers: [ContactsController],
  providers: [ContactsService],
  exports: [ContactsService],
})
export class ContactsModule {}

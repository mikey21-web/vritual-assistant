import { Module } from '@nestjs/common';
import { CrmMappingsService } from './crm-mappings.service';
import { CrmMappingsController } from './crm-mappings.controller';

@Module({
  controllers: [CrmMappingsController],
  providers: [CrmMappingsService],
  exports: [CrmMappingsService],
})
export class CrmMappingsModule {}

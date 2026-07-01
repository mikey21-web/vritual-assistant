import { Module } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import { ApiKeysController } from './api-keys.controller';

@Module({
  controllers: [TenantsController, ApiKeysController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}

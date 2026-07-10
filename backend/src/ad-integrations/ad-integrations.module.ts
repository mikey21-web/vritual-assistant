import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AdIntegrationsController } from './ad-integrations.controller';
import { AdIntegrationsService } from './ad-integrations.service';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [HttpModule, SharedModule],
  controllers: [AdIntegrationsController],
  providers: [AdIntegrationsService],
})
export class AdIntegrationsModule {}

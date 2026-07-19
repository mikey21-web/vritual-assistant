import { Module } from '@nestjs/common';
import { NriProfilesService } from './nri-profiles.service';
import { NriProfilesController } from './nri-profiles.controller';

@Module({
  controllers: [NriProfilesController],
  providers: [NriProfilesService],
  exports: [NriProfilesService],
})
export class NriProfilesModule {}

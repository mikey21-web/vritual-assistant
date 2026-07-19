import { Module } from '@nestjs/common';
import { LaunchControlService } from './launch-control.service';
import { LaunchControlController } from './launch-control.controller';

@Module({
  controllers: [LaunchControlController],
  providers: [LaunchControlService],
  exports: [LaunchControlService],
})
export class LaunchControlModule {}

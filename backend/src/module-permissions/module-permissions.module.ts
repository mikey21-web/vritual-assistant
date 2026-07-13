import { Module } from '@nestjs/common';
import { ModulePermissionsService } from './module-permissions.service';
import { ModulePermissionsController } from './module-permissions.controller';

@Module({
  controllers: [ModulePermissionsController],
  providers: [ModulePermissionsService],
  exports: [ModulePermissionsService],
})
export class ModulePermissionsModule {}

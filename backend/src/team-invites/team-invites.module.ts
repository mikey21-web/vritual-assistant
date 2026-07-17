import { Module } from '@nestjs/common';
import { TeamInvitesService } from './team-invites.service';
import { TeamInvitesController } from './team-invites.controller';
import { SharedModule } from '../shared/shared.module';
import { ModulePermissionsModule } from '../module-permissions/module-permissions.module';

@Module({
  imports: [SharedModule, ModulePermissionsModule],
  controllers: [TeamInvitesController],
  providers: [TeamInvitesService],
  exports: [TeamInvitesService],
})
export class TeamInvitesModule {}

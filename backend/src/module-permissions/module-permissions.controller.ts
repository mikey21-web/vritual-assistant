import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ModulePermissionsService } from './module-permissions.service';
import { SetPermissionDto, ApplyPresetDto } from './dto/module-permissions.dto';

@ApiTags('ModulePermissions')
@Controller('module-permissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ModulePermissionsController {
  constructor(private service: ModulePermissionsService) {}

  @Get('presets') @Roles('OWNER', 'ADMIN') listPresets() { return this.service.listPresets(); }
  @Get('users/:userId') @Roles('OWNER', 'ADMIN') listForUser(@Param('userId') userId: string) { return this.service.listForUser(userId); }
  @Post('users/:userId') @Roles('OWNER', 'ADMIN') setPermission(@Param('userId') userId: string, @Body() d: SetPermissionDto) { return this.service.setPermission(userId, d.module, d.level); }
  @Post('users/:userId/apply-preset') @Roles('OWNER', 'ADMIN') applyPreset(@Param('userId') userId: string, @Body() d: ApplyPresetDto) { return this.service.applyPreset(userId, d.preset); }
}

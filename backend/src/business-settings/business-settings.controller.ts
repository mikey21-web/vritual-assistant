import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';
import { BusinessSettingsService } from './business-settings.service';
import { UpdateBusinessSettingsDto } from './dto/update-business-settings.dto';

@ApiTags('Business Settings')
@Controller()
export class BusinessSettingsController {
  constructor(private service: BusinessSettingsService) {}

  @Get('branding')
  @Public()
  @ApiOperation({ summary: 'Public branding endpoint — no auth required' })
  getBranding() {
    return this.service.getBranding();
  }

  @Get('business-settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  get() { return this.service.get(); }

  @Patch('business-settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles('OWNER', 'ADMIN')
  update(@Body() data: UpdateBusinessSettingsDto) { return this.service.update(data); }
}

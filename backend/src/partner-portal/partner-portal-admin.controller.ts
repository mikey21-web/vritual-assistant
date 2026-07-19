import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PartnerAuthService } from './partner-auth.service';
import { CreatePartnerPortalUserDto } from './dto/partner-portal.dto';

/** Internal-staff-only surface for provisioning partner portal logins — guarded by the normal internal auth. */
@ApiTags('Partner Portal Admin')
@Controller('partner-portal-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PartnerPortalAdminController {
  constructor(private authService: PartnerAuthService) {}

  @Post('users')
  @Roles('OWNER', 'ADMIN')
  createUser(@Body() dto: CreatePartnerPortalUserDto, @Req() req: any) {
    return this.authService.createPortalUser(req.user.tenantId, dto, req.user.id);
  }
}

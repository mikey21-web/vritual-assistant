import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PossessionService } from './possession.service';

@ApiTags('Possession')
@Controller('bookings/:bookingId/possession')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PossessionController {
  constructor(private service: PossessionService) {}

  @Get()
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SUPPORT_AGENT', 'VIEWER')
  get(@Param('bookingId') bookingId: string, @Req() req: any) { return this.service.getOrCreate(req.user.tenantId, bookingId); }

  @Post('confirm/:field')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SUPPORT_AGENT')
  confirm(@Param('bookingId') bookingId: string, @Param('field') field: any, @Req() req: any) {
    return this.service.confirmPrecondition(req.user.tenantId, bookingId, field, req.user.id);
  }

  @Post('offer')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  offer(@Param('bookingId') bookingId: string, @Req() req: any) { return this.service.recordOffered(req.user.tenantId, bookingId, req.user.id); }

  @Post('acknowledge')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SUPPORT_AGENT')
  acknowledge(@Param('bookingId') bookingId: string, @Req() req: any) { return this.service.recordAcknowledged(req.user.tenantId, bookingId, req.user.id); }

  @Post('hand-over')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  handOver(@Param('bookingId') bookingId: string, @Req() req: any) { return this.service.recordHandedOver(req.user.tenantId, bookingId, req.user.id); }
}

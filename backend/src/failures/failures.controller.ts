import { Controller, Get, Post, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { FailuresService } from './failures.service';

@ApiTags('Failures')
@Controller('failures')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class FailuresController {
  constructor(private svc: FailuresService) {}

  @Get() @Roles('OWNER', 'ADMIN', 'MANAGER')
  getInbox() { return this.svc.getInbox(); }

  @Get('open') @Roles('OWNER', 'ADMIN', 'MANAGER')
  getOpen() { return this.svc.getInbox({ status: 'open' }); }

  @Post(':id/retry') @Roles('OWNER', 'ADMIN', 'MANAGER')
  retry(@Param('id') id: string) { return this.svc.retry(id); }

  @Post(':id/resolve') @Roles('OWNER', 'ADMIN', 'MANAGER')
  resolve(@Param('id') id: string, @Req() req) { return this.svc.resolve(id, req.user?.sub); }
}

import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { TelephonyService } from './telephony.service';

@ApiTags('Telephony')
@Controller('telephony')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TelephonyController {
  constructor(private telephonyService: TelephonyService) {}

  @Post('call')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  async initiateCall(@Body() body: { leadId: string }, @Req() req: any) {
    return this.telephonyService.initiateCall(body.leadId, req.user.id);
  }
}

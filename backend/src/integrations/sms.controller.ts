import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { IntegrationsService } from './integrations.service';

@ApiTags('SMS')
@Controller('sms')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SmsController {
  constructor(private integrations: IntegrationsService) {}

  @Post('test')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  async testSend(@Body() d: { to: string; message: string }) {
    return this.integrations.testSms(d.to, d.message);
  }
}

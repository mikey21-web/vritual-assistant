import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AutonomyGuardrailsService } from './autonomy-guardrails.service';

@ApiTags('Mikey Guardrails')
@Controller('mikey/guardrails')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class GuardrailsController {
  constructor(private guardrails: AutonomyGuardrailsService) {}

  @Get('auto-send/:tenantId/:leadId')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Check whether auto-send is allowed for this lead under current tenant guardrails' })
  async checkAutoSend(@Param('tenantId') tenantId: string, @Param('leadId') leadId: string) {
    return this.guardrails.canAutoSend(tenantId, leadId);
  }
}

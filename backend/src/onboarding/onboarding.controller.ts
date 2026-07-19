import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OnboardingService } from './onboarding.service';

@ApiTags('Onboarding')
@Controller('onboarding')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class OnboardingController {
  constructor(private service: OnboardingService) {}

  @Get('progress')
  @Roles('OWNER', 'ADMIN')
  getProgress(@Req() req: any) {
    return this.service.getProgress(req.user.tenantId);
  }

  @Post('steps')
  @Roles('OWNER', 'ADMIN')
  recordStep(@Req() req: any, @Body() body: { stepKey: string; status: 'not_started' | 'in_progress' | 'blocked' | 'complete' }) {
    return this.service.recordStep(req.user.tenantId, body.stepKey, body.status, req.user.id);
  }
}

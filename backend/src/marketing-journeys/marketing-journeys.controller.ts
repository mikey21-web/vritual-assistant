import { Controller, Get, Post, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { MarketingJourneysService } from './marketing-journeys.service';
import { CreateJourneyDto } from './dto/create-journey.dto';
import { AddStepDto } from './dto/add-step.dto';
import { EnrollLeadDto } from './dto/enroll-lead.dto';

@ApiTags('Marketing Journeys')
@Controller('marketing-journeys')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MarketingJourneysController {
  constructor(private service: MarketingJourneysService) {}

  @Post()
  @Roles('OWNER', 'ADMIN')
  create(@Body() dto: CreateJourneyDto, @Req() req: any) {
    return this.service.createJourney(req.user.tenantId, dto, req.user.id);
  }

  @Get()
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER')
  findAll(@Req() req: any) {
    return this.service.findAll(req.user.tenantId);
  }

  @Get(':id')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.service.findOne(req.user.tenantId, id);
  }

  @Post(':id/steps')
  @Roles('OWNER', 'ADMIN')
  addStep(@Param('id') id: string, @Body() dto: AddStepDto, @Req() req: any) {
    return this.service.addStep(req.user.tenantId, id, dto);
  }

  @Post(':id/activate')
  @Roles('OWNER', 'ADMIN')
  activate(@Param('id') id: string, @Req() req: any) {
    return this.service.activateJourney(req.user.tenantId, id, req.user.id);
  }

  @Post(':id/pause')
  @Roles('OWNER', 'ADMIN')
  pause(@Param('id') id: string, @Req() req: any) {
    return this.service.pauseJourney(req.user.tenantId, id, req.user.id);
  }

  @Get(':id/preview-audience')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  previewAudience(@Param('id') id: string, @Req() req: any) {
    return this.service.previewAudience(req.user.tenantId, id);
  }

  @Post(':id/enroll')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  enroll(@Param('id') id: string, @Body() dto: EnrollLeadDto, @Req() req: any) {
    return this.service.enrollLead(req.user.tenantId, id, dto.leadId, req.user.id);
  }
}

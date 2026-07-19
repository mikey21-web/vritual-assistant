import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PaymentPlanTemplatesService } from './payment-plan-templates.service';
import { CreatePaymentPlanTemplateDto, GeneratePaymentScheduleDto } from './dto/payment-plan-template.dto';

@ApiTags('Payment Plan Templates')
@Controller('payment-plan-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PaymentPlanTemplatesController {
  constructor(private service: PaymentPlanTemplatesService) {}

  @Get()
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER')
  findAll(@Query() q: any, @Req() req: any) {
    return this.service.findAll(req.user.tenantId, q);
  }

  @Post()
  @Roles('OWNER', 'ADMIN')
  create(@Body() dto: CreatePaymentPlanTemplateDto, @Req() req: any) {
    return this.service.create(req.user.tenantId, dto as any);
  }

  @Post(':id/deactivate')
  @Roles('OWNER', 'ADMIN')
  deactivate(@Param('id') id: string, @Req() req: any) {
    return this.service.deactivate(req.user.tenantId, id);
  }

  @Post('generate')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  generate(@Body() dto: GeneratePaymentScheduleDto, @Req() req: any) {
    return this.service.generateSchedule(req.user.tenantId, dto);
  }
}

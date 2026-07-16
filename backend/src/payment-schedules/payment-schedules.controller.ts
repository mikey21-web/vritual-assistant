import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PaymentSchedulesService } from './payment-schedules.service';
import { CreatePaymentScheduleDto, UpdatePaymentScheduleDto } from './dto/payment-schedule.dto';

@ApiTags('Payment Schedules')
@Controller('payment-schedules')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PaymentSchedulesController {
  constructor(private service: PaymentSchedulesService) {}

  @Get() @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER')
  findAll(@Query() q: any) { return this.service.findAll(q); }

  @Get(':id') @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post() @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  create(@Body() dto: CreatePaymentScheduleDto, @Req() req: any) {
    return this.service.create({ ...dto, tenantId: req.user?.tenantId });
  }

  @Patch(':id') @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  update(@Param('id') id: string, @Body() dto: UpdatePaymentScheduleDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/mark-paid') @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  markPaid(@Param('id') id: string) { return this.service.markPaid(id); }

  @Delete(':id') @Roles('OWNER', 'ADMIN')
  remove(@Param('id') id: string) { return this.service.remove(id); }
}

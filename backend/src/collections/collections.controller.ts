import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CollectionsService } from './collections.service';
import { RecordPaymentReceiptDto } from './dto/collections.dto';

@ApiTags('Collections')
@Controller('collections')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CollectionsController {
  constructor(private service: CollectionsService) {}

  @Get('receipts')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER', 'SALES_AGENT', 'SUPPORT_AGENT')
  findAll(@Query() q: any, @Req() req: any) {
    return this.service.findAll(req.user.tenantId, q);
  }

  @Get('receipts/:id')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER', 'SALES_AGENT', 'SUPPORT_AGENT')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.service.findOne(req.user.tenantId, id);
  }

  @Get('ledger/:leadId')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER', 'SALES_AGENT', 'SUPPORT_AGENT')
  ledger(@Param('leadId') leadId: string, @Req() req: any) {
    return this.service.ledger(req.user.tenantId, leadId);
  }

  @Post('receipts')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SUPPORT_AGENT')
  record(@Body() dto: RecordPaymentReceiptDto, @Req() req: any) {
    return this.service.recordReceipt(req.user.tenantId, { ...dto, recordedById: req.user.id });
  }

  @Post('receipts/:id/confirm')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SUPPORT_AGENT')
  confirm(@Param('id') id: string, @Req() req: any) {
    return this.service.confirm(req.user.tenantId, id, req.user.id);
  }

  @Post('receipts/:id/reverse')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  reverse(@Param('id') id: string, @Body('reason') reason: string, @Req() req: any) {
    return this.service.reverse(req.user.tenantId, id, reason, req.user.id);
  }
}

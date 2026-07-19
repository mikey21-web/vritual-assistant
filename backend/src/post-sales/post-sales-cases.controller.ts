import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PostSalesCasesService } from './post-sales-cases.service';

@ApiTags('Post-Sales Cases')
@Controller('post-sales-cases')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PostSalesCasesController {
  constructor(private service: PostSalesCasesService) {}

  @Get('bookings/:bookingId')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SUPPORT_AGENT', 'VIEWER')
  findForBooking(@Param('bookingId') bookingId: string, @Req() req: any) {
    return this.service.findCasesForBooking(req.user.tenantId, bookingId);
  }

  @Post('transfers')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SUPPORT_AGENT')
  requestTransfer(@Body() dto: any, @Req() req: any) { return this.service.requestTransfer(req.user.tenantId, dto, req.user.id); }
  @Post('transfers/:id/approve')
  @Roles('OWNER', 'ADMIN')
  approveTransfer(@Param('id') id: string, @Body('reason') reason: string, @Req() req: any) { return this.service.decideTransfer(req.user.tenantId, id, 'APPROVED', req.user.id, reason); }
  @Post('transfers/:id/reject')
  @Roles('OWNER', 'ADMIN')
  rejectTransfer(@Param('id') id: string, @Body('reason') reason: string, @Req() req: any) { return this.service.decideTransfer(req.user.tenantId, id, 'REJECTED', req.user.id, reason); }
  @Post('transfers/:id/complete')
  @Roles('OWNER', 'ADMIN', 'SUPPORT_AGENT')
  completeTransfer(@Param('id') id: string, @Req() req: any) { return this.service.completeTransfer(req.user.tenantId, id, req.user.id); }

  @Post('unit-shifts')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  requestUnitShift(@Body() dto: any, @Req() req: any) { return this.service.requestUnitShift(req.user.tenantId, dto, req.user.id); }
  @Post('unit-shifts/:id/approve')
  @Roles('OWNER', 'ADMIN')
  approveUnitShift(@Param('id') id: string, @Req() req: any) { return this.service.decideUnitShift(req.user.tenantId, id, 'APPROVED', req.user.id); }
  @Post('unit-shifts/:id/reject')
  @Roles('OWNER', 'ADMIN')
  rejectUnitShift(@Param('id') id: string, @Req() req: any) { return this.service.decideUnitShift(req.user.tenantId, id, 'REJECTED', req.user.id); }
  @Post('unit-shifts/:id/complete')
  @Roles('OWNER', 'ADMIN')
  completeUnitShift(@Param('id') id: string, @Req() req: any) { return this.service.completeUnitShift(req.user.tenantId, id, req.user.id); }

  @Post('cancellations')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  requestCancellation(@Body() dto: any, @Req() req: any) { return this.service.requestCancellation(req.user.tenantId, dto, req.user.id); }
  @Post('cancellations/:id/approve')
  @Roles('OWNER', 'ADMIN')
  approveCancellation(@Param('id') id: string, @Req() req: any) { return this.service.decideCancellation(req.user.tenantId, id, 'APPROVED', req.user.id); }
  @Post('cancellations/:id/reject')
  @Roles('OWNER', 'ADMIN')
  rejectCancellation(@Param('id') id: string, @Req() req: any) { return this.service.decideCancellation(req.user.tenantId, id, 'REJECTED', req.user.id); }
  @Post('cancellations/:id/complete')
  @Roles('OWNER', 'ADMIN')
  completeCancellation(@Param('id') id: string, @Req() req: any) { return this.service.completeCancellation(req.user.tenantId, id, req.user.id); }

  @Post('refunds')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SUPPORT_AGENT')
  requestRefund(@Body() dto: any, @Req() req: any) { return this.service.requestRefund(req.user.tenantId, dto, req.user.id); }
  @Post('refunds/:id/verify-bank-account')
  @Roles('OWNER', 'ADMIN')
  verifyBank(@Param('id') id: string, @Req() req: any) { return this.service.verifyRefundBankAccount(req.user.tenantId, id, req.user.id); }
  @Post('refunds/:id/approve')
  @Roles('OWNER', 'ADMIN')
  approveRefund(@Param('id') id: string, @Req() req: any) { return this.service.approveRefund(req.user.tenantId, id, req.user.id); }
  @Post('refunds/:id/mark-paid')
  @Roles('OWNER', 'ADMIN')
  markRefundPaid(@Param('id') id: string, @Body('paymentReference') paymentReference: string, @Req() req: any) { return this.service.markRefundPaid(req.user.tenantId, id, paymentReference, req.user.id); }
}

import { Controller, Get, Post, Body, Param, UseGuards, Req, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../auth/public.decorator';
import { BuyerAuthGuard } from './buyer-auth.guard';
import { BuyerAuthService } from './buyer-auth.service';
import { BuyerPortalService } from './buyer-portal.service';
import { KycService } from '../kyc/kyc.service';
import { TicketsService } from '../tickets/tickets.service';
import { RequestBuyerMagicLinkDto, VerifyBuyerMagicLinkDto } from './dto/buyer-portal.dto';

/**
 * Public-facing buyer portal. @Public() at the class level opts out of the
 * app's global JwtAuthGuard/RolesGuard (internal-user-only) — real auth here
 * is BuyerAuthGuard, scoped to exactly one booking (spec 54.1).
 */
@ApiTags('Buyer Portal')
@Controller('buyer-portal')
@Public()
export class BuyerPortalController {
  constructor(
    private authService: BuyerAuthService,
    private portalService: BuyerPortalService,
    private kyc: KycService,
    private tickets: TicketsService,
  ) {}

  @Post('request-link')
  requestLink(@Body() dto: RequestBuyerMagicLinkDto) {
    return this.authService.requestMagicLink(dto.bookingNumber, dto.contactHint);
  }

  @Post('verify')
  verify(@Body() dto: VerifyBuyerMagicLinkDto) {
    return this.authService.verifyMagicLink(dto.token);
  }

  @UseGuards(BuyerAuthGuard)
  @ApiBearerAuth()
  @Get('booking')
  booking(@Req() req: any) {
    return this.portalService.getBooking(req.user.tenantId, req.user.bookingId);
  }

  @UseGuards(BuyerAuthGuard)
  @ApiBearerAuth()
  @Get('payment-schedule')
  paymentSchedule(@Req() req: any) {
    return this.portalService.getPaymentSchedule(req.user.tenantId, req.user.bookingId);
  }

  @UseGuards(BuyerAuthGuard)
  @ApiBearerAuth()
  @Get('receipts')
  receipts(@Req() req: any) {
    return this.portalService.getReceipts(req.user.tenantId, req.user.bookingId);
  }

  @UseGuards(BuyerAuthGuard)
  @ApiBearerAuth()
  @Get('documents')
  documents(@Req() req: any) {
    return this.portalService.getDocuments(req.user.tenantId, req.user.bookingId);
  }

  @UseGuards(BuyerAuthGuard)
  @ApiBearerAuth()
  @Get('kyc')
  kycChecklist(@Req() req: any) {
    return this.portalService.getKycChecklist(req.user.tenantId, req.user.leadId);
  }

  @UseGuards(BuyerAuthGuard)
  @ApiBearerAuth()
  @Post('kyc/:id/upload')
  async uploadDocument(@Param('id') id: string, @Body() body: { mediaFileId: string }, @Req() req: any) {
    // Confirm the document belongs to this buyer's own lead before allowing the upload.
    const doc = await this.kyc.findOne(req.user.tenantId, id);
    if (doc.leadId !== req.user.leadId) {
      throw new UnauthorizedException('Document does not belong to this booking');
    }
    return this.kyc.upload(req.user.tenantId, id, { mediaFileId: body.mediaFileId, source: 'buyer_upload' });
  }

  @UseGuards(BuyerAuthGuard)
  @ApiBearerAuth()
  @Get('construction-updates')
  constructionUpdates(@Req() req: any) {
    return this.portalService.getConstructionUpdates(req.user.tenantId, req.user.bookingId);
  }

  @UseGuards(BuyerAuthGuard)
  @ApiBearerAuth()
  @Get('tickets')
  myTickets(@Req() req: any) {
    return this.tickets.findAll({ leadId: req.user.leadId });
  }

  @UseGuards(BuyerAuthGuard)
  @ApiBearerAuth()
  @Post('tickets')
  createTicket(@Body() body: { subject: string; description: string; priority?: string; category?: string }, @Req() req: any) {
    return this.tickets.create({ subject: body.subject, description: body.description, leadId: req.user.leadId, priority: (body.priority as any) || 'MEDIUM', category: body.category } as any, 'buyer-portal');
  }
}

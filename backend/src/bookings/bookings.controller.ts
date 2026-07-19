import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Req, Headers } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { BookingsService } from './bookings.service';
import { BookingConfirmationService } from './booking-confirmation.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { CheckAvailabilityDto } from './dto/check-availability.dto';
import { CreatePurchaseBookingDto, ConfirmBookingDto } from './dto/booking-confirmation.dto';

@ApiTags('Bookings')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class BookingsController {
  constructor(
    private service: BookingsService,
    private confirmation: BookingConfirmationService,
  ) {}

  @Post('bookings/check-availability')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  checkAvailability(@Body() dto: CheckAvailabilityDto) {
    return this.service.checkAvailability(
      new Date(dto.startTime),
      dto.endTime ? new Date(dto.endTime) : undefined,
      dto.durationMinutes,
    );
  }

  @Get('bookings')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER', 'SALES_AGENT')
  findAll(@Query() q: any) {
    return this.service.findAll(q);
  }

  @Get('bookings/:id')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER', 'SALES_AGENT')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post('bookings')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  create(@Body() dto: CreateBookingDto, @Req() req: any) {
    return this.service.create({
      tenantId: req.user?.tenantId,
      leadId: dto.leadId,
      title: dto.title,
      description: dto.description,
      startTime: new Date(dto.startTime),
      endTime: dto.endTime ? new Date(dto.endTime) : undefined,
      price: dto.price,
      currency: dto.currency,
      propertyId: dto.propertyId,
      unitId: dto.unitId,
    });
  }

  @Post('leads/:id/bookings')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  createForLead(@Param('id') leadId: string, @Body() dto: CreateBookingDto, @Req() req: any) {
    return this.service.create({
      tenantId: req.user?.tenantId,
      leadId,
      title: dto.title,
      description: dto.description,
      startTime: new Date(dto.startTime),
      endTime: dto.endTime ? new Date(dto.endTime) : undefined,
      price: dto.price,
      currency: dto.currency,
      propertyId: dto.propertyId,
      unitId: dto.unitId,
    });
  }

  @Patch('bookings/:id')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  update(@Param('id') id: string, @Body() dto: UpdateBookingDto) {
    return this.service.update(id, dto);
  }

  @Get('tenants/:tenantId/bookings')
  @Roles('OWNER', 'ADMIN', 'SALES_AGENT')
  findByTenant(@Param('tenantId') tenantId: string, @Query() q: any) {
    return this.service.findByTenant(tenantId, q);
  }

  @Post('bookings/:id/payment-link')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  createPaymentLink(@Param('id') id: string, @Headers('origin') origin?: string) {
    return this.service.createPaymentLink(id, origin);
  }

  @Post('bookings/purchase')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  createPurchaseDraft(@Body() dto: CreatePurchaseBookingDto, @Req() req: any) {
    return this.confirmation.createDraft({
      tenantId: req.user.tenantId,
      leadId: dto.leadId,
      unitId: dto.unitId,
      costSheetId: dto.costSheetId,
      createdById: req.user.id,
    });
  }

  @Post('bookings/:id/confirm-purchase')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  confirmPurchase(@Param('id') id: string, @Body() dto: ConfirmBookingDto, @Req() req: any) {
    return this.confirmation.confirm(req.user.tenantId, id, {
      applicants: dto.applicants,
      bookingAmountPaise: dto.bookingAmountPaise,
      overrideMissingHold: dto.overrideMissingHold,
      actorId: req.user.id,
    });
  }

  @Post('bookings/:id/cancel-purchase')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  cancelPurchase(@Param('id') id: string, @Body('reason') reason: string, @Req() req: any) {
    return this.confirmation.cancel(req.user.tenantId, id, reason, req.user.id);
  }
}

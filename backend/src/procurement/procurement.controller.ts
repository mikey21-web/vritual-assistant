import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ProcurementService } from './procurement.service';
import {
  CreatePartnerDto, CreateVendorBookingDto, UpdateVendorBookingDto,
  CreatePurchaseOrderDto, UpdatePurchaseOrderDto,
} from './dto/procurement.dto';
import { PaginationDto } from '../shared/dto/pagination.dto';

const WRITE_ROLES = ['OWNER', 'ADMIN', 'MANAGER'] as const;
const READ_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT'] as const;

@ApiTags('Procurement')
@Controller('procurement')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ProcurementController {
  constructor(private service: ProcurementService) {}

  @Get('partners') @Roles(...READ_ROLES) findPartners(@Query() q: PaginationDto & { type?: string }) { return this.service.findPartners(q); }
  @Post('partners') @Roles(...WRITE_ROLES) createPartner(@Body() d: CreatePartnerDto) { return this.service.createPartner(d); }

  @Get('vendor-bookings') @Roles(...READ_ROLES) findVendorBookings(@Query() q: PaginationDto & { status?: string; eventId?: string }) { return this.service.findVendorBookings(q); }
  @Post('vendor-bookings') @Roles(...WRITE_ROLES) createVendorBooking(@Body() d: CreateVendorBookingDto) { return this.service.createVendorBooking(d); }
  @Get('vendor-bookings/:id') @Roles(...READ_ROLES) findVendorBooking(@Param('id') id: string) { return this.service.findVendorBooking(id); }
  @Patch('vendor-bookings/:id') @Roles(...WRITE_ROLES) updateVendorBooking(@Param('id') id: string, @Body() d: UpdateVendorBookingDto) { return this.service.updateVendorBooking(id, d); }

  @Get('purchase-orders') @Roles(...READ_ROLES) findPurchaseOrders(@Query() q: PaginationDto & { status?: string; eventId?: string }) { return this.service.findPurchaseOrders(q); }
  @Post('purchase-orders') @Roles(...WRITE_ROLES) createPurchaseOrder(@Body() d: CreatePurchaseOrderDto) { return this.service.createPurchaseOrder(d); }
  @Get('purchase-orders/:id') @Roles(...READ_ROLES) findPurchaseOrder(@Param('id') id: string) { return this.service.findPurchaseOrder(id); }
  @Patch('purchase-orders/:id') @Roles(...WRITE_ROLES) updatePurchaseOrder(@Param('id') id: string, @Body() d: UpdatePurchaseOrderDto) { return this.service.updatePurchaseOrder(id, d); }
}

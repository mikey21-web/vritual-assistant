import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ShipmentsService } from './shipments.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';
import { QuoteDto } from './dto/quote.dto';

@ApiTags('Shipments')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ShipmentsController {
  constructor(private service: ShipmentsService) {}

  @Post('shipments/quote')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  quote(@Body() dto: QuoteDto) {
    return this.service.calculateQuote(dto);
  }

  @Post('shipments')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  create(@Body() dto: CreateShipmentDto, @Req() req: any) {
    return this.service.create({
      tenantId: req.user?.tenantId,
      leadId: dto.leadId,
      origin: dto.origin,
      destination: dto.destination,
      title: dto.title,
      shipmentType: dto.shipmentType,
      weight: dto.weight,
      cargoType: dto.cargoType,
      pickupDate: dto.pickupDate ? new Date(dto.pickupDate) : undefined,
      scheduledPickupAt: dto.scheduledPickupAt ? new Date(dto.scheduledPickupAt) : undefined,
      scheduledDeliveryAt: dto.scheduledDeliveryAt ? new Date(dto.scheduledDeliveryAt) : undefined,
      quotedPrice: dto.quotedPrice,
      carrierName: dto.carrierName,
      notes: dto.notes,
    });
  }

  @Post('leads/:id/shipments')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  createForLead(@Param('id') leadId: string, @Body() dto: CreateShipmentDto, @Req() req: any) {
    return this.service.create({
      tenantId: req.user?.tenantId,
      leadId,
      origin: dto.origin,
      destination: dto.destination,
      title: dto.title,
      shipmentType: dto.shipmentType,
      weight: dto.weight,
      cargoType: dto.cargoType,
      pickupDate: dto.pickupDate ? new Date(dto.pickupDate) : undefined,
      scheduledPickupAt: dto.scheduledPickupAt ? new Date(dto.scheduledPickupAt) : undefined,
      scheduledDeliveryAt: dto.scheduledDeliveryAt ? new Date(dto.scheduledDeliveryAt) : undefined,
      quotedPrice: dto.quotedPrice,
      carrierName: dto.carrierName,
      notes: dto.notes,
    });
  }

  @Get('shipments')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER', 'SALES_AGENT')
  findAll(@Query() q: any, @Req() req: any) {
    return this.service.findAll({
      tenantId: req.user?.tenantId,
      status: q.status,
      search: q.search,
      page: q.page ? +q.page : 1,
      limit: q.limit ? +q.limit : 20,
      sortBy: q.sortBy,
      sortOrder: q.sortOrder,
    });
  }

  @Get('shipments/:id')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER', 'SALES_AGENT')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch('shipments/:id')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  update(@Param('id') id: string, @Body() dto: UpdateShipmentDto) {
    return this.service.update(id, dto);
  }

  @Patch('shipments/:id/status')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  updateStatus(@Param('id') id: string, @Body() body: { status: string; notes?: string; location?: string }) {
    return this.service.updateStatus(id, body.status as any, body.notes, body.location);
  }

  @Get('tenants/:tenantId/shipments')
  @Roles('OWNER', 'ADMIN')
  findByTenant(@Param('tenantId') tenantId: string, @Query() q: any) {
    return this.service.findAll({ tenantId, status: q.status, page: q.page ? +q.page : 1, limit: q.limit ? +q.limit : 20 });
  }
}

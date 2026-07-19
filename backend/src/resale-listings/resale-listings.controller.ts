import { Controller, Get, Post, Patch, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ResaleListingsService } from './resale-listings.service';

@ApiTags('Resale/Rental Listings')
@Controller('resale-listings')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ResaleListingsController {
  constructor(private service: ResaleListingsService) {}

  @Post()
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  create(@Body() body: any, @Req() req: any) {
    return this.service.createListing(req.user.tenantId, { ...body, createdById: req.user.id });
  }

  @Get()
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER')
  findAll(@Req() req: any, @Query() q: any) {
    return this.service.findAll(req.user.tenantId, {
      listingType: q.listingType, status: q.status,
      location: q.location, bedrooms: q.bedrooms ? parseInt(q.bedrooms) : undefined,
      minPrice: q.minPrice ? parseFloat(q.minPrice) : undefined,
      maxPrice: q.maxPrice ? parseFloat(q.maxPrice) : undefined,
    });
  }

  @Get(':id')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.service.findOne(req.user.tenantId, id);
  }

  @Patch(':id/status')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  updateStatus(@Param('id') id: string, @Body() body: { status: string }, @Req() req: any) {
    return this.service.updateStatus(req.user.tenantId, id, body.status);
  }

  @Get('insights/market')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER')
  marketInsights(@Req() req: any, @Query('location') location?: string) {
    return this.service.getMarketInsights(req.user.tenantId, location);
  }
}

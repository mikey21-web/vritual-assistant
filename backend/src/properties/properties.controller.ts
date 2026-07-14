import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { SearchPropertyDto } from './dto/search-property.dto';

@ApiTags('Properties')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PropertiesController {
  constructor(private service: PropertiesService) {}

  @Post('properties')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  create(@Body() dto: CreatePropertyDto, @Req() req: any) {
    return this.service.create({
      tenantId: req.user?.tenantId,
      ...dto,
      availableFrom: dto.availableFrom ? new Date(dto.availableFrom) : undefined,
    });
  }

  @Get('properties')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER', 'SALES_AGENT')
  findAll(@Query() q: any, @Req() req: any) {
    return this.service.findAll({
      tenantId: req.user?.tenantId,
      propertyType: q.propertyType,
      status: q.status,
      minPrice: q.minPrice ? +q.minPrice : undefined,
      maxPrice: q.maxPrice ? +q.maxPrice : undefined,
      bedrooms: q.bedrooms ? +q.bedrooms : undefined,
      location: q.location,
      featured: q.featured === 'true' ? true : q.featured === 'false' ? false : undefined,
      page: q.page ? +q.page : 1,
      limit: q.limit ? +q.limit : 20,
      sortBy: q.sortBy,
      sortOrder: q.sortOrder,
    });
  }

  @Get('properties/search')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER', 'SALES_AGENT')
  search(@Query() q: any, @Req() req: any) {
    const tenantId = q.tenantId || req.user?.tenantId;
    return this.service.search(tenantId, {
      text: q.query || q.text,
      propertyType: q.propertyType,
      minPrice: q.minPrice ? +q.minPrice : undefined,
      maxPrice: q.maxPrice ? +q.maxPrice : undefined,
      bedrooms: q.bedrooms ? +q.bedrooms : undefined,
      minArea: q.minArea ? +q.minArea : undefined,
      maxArea: q.maxArea ? +q.maxArea : undefined,
      location: q.location,
      status: q.status,
      limit: q.limit ? +q.limit : 10,
    });
  }

  @Get('properties/:id')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER', 'SALES_AGENT')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch('properties/:id')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  update(@Param('id') id: string, @Body() dto: UpdatePropertyDto) {
    return this.service.update(id, dto);
  }

  @Delete('properties/:id')
  @Roles('OWNER', 'ADMIN')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Get('tenants/:tenantId/properties')
  @Roles('OWNER', 'ADMIN')
  findByTenant(@Param('tenantId') tenantId: string, @Query() q: any) {
    return this.service.findAll({
      tenantId,
      propertyType: q.propertyType,
      status: q.status,
      page: q.page ? +q.page : 1,
      limit: q.limit ? +q.limit : 20,
    });
  }
}

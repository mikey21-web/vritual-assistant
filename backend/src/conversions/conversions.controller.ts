import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ConversionsService } from './conversions.service';
import { CreateConversionDto } from '../scoring-rules/dto/scoring-routing.dto';
import { PaginationDto } from '../shared/dto/pagination.dto';
import { UpdateConversionDto } from './dto/update-conversion.dto';

@ApiTags('Conversions')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ConversionsController {
  constructor(private service: ConversionsService) {}
  @Get('conversions') @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER') findAll(@Query() q: PaginationDto) { return this.service.findAll(q); }
  @Post('conversions') @Roles('OWNER', 'ADMIN', 'MANAGER') create(@Body() d: CreateConversionDto) { return this.service.create(d); }
  @Post('leads/:id/conversions') @Roles('OWNER', 'ADMIN', 'MANAGER') createForLead(@Param('id') id: string, @Body() d: CreateConversionDto) { return this.service.createForLead(id, d); }
  @Patch('conversions/:id') @Roles('OWNER', 'ADMIN', 'MANAGER') update(@Param('id') id: string, @Body() d: UpdateConversionDto) { return this.service.update(id, d); }
}

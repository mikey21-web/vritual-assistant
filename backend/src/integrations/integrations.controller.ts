import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { IntegrationsService } from './integrations.service';
import { CreateIntegrationDto } from '../scoring-rules/dto/scoring-routing.dto';
import { PaginationDto } from '../shared/dto/pagination.dto';
import { UpdateIntegrationDto } from './dto/update-integration.dto';

@ApiTags('Integrations')
@Controller('integrations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class IntegrationsController {
  constructor(private service: IntegrationsService) {}

  @Get() @Roles('OWNER', 'ADMIN') findAll(@Query() q: PaginationDto) { return this.service.findAll(q); }
  @Post() @Roles('OWNER', 'ADMIN') create(@Body() d: CreateIntegrationDto) { return this.service.create(d); }
  @Get(':id') @Roles('OWNER', 'ADMIN') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Patch(':id') @Roles('OWNER', 'ADMIN') update(@Param('id') id: string, @Body() d: UpdateIntegrationDto) { return this.service.update(id, d); }
  @Delete(':id') @Roles('OWNER', 'ADMIN') remove(@Param('id') id: string) { return this.service.remove(id); }
  @Post(':id/test') @Roles('OWNER', 'ADMIN') test(@Param('id') id: string) { return this.service.test(id); }
  @Post('migrate-encrypt') @Roles('OWNER') migrateEncrypt() { return this.service.migratePlaintextConfigs(); }
}

import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RoutingRulesService } from './routing-rules.service';
import { CreateRoutingRuleDto } from '../scoring-rules/dto/scoring-routing.dto';
import { PaginationDto } from '../shared/dto/pagination.dto';
import { UpdateRoutingRuleDto } from './dto/update-routing-rule.dto';

@ApiTags('Routing Rules')
@Controller('routing-rules')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RoutingRulesController {
  constructor(private service: RoutingRulesService) {}
  @Get() @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER') findAll(@Query() q: PaginationDto) { return this.service.findAll(q); }
  @Post() @Roles('OWNER', 'ADMIN', 'MANAGER') create(@Body() d: CreateRoutingRuleDto) { return this.service.create(d); }
  @Patch(':id') @Roles('OWNER', 'ADMIN', 'MANAGER') update(@Param('id') id: string, @Body() d: UpdateRoutingRuleDto) { return this.service.update(id, d); }
  @Delete(':id') @Roles('OWNER', 'ADMIN') remove(@Param('id') id: string) { return this.service.remove(id); }
  @Post('test') @Roles('OWNER', 'ADMIN', 'MANAGER') test(@Body() d: { conditions: Record<string, string>; testLead: Record<string, string> }) { return this.service.test(d); }
}

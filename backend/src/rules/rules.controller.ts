import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RulesService } from './rules.service';
import { TestRuleDto, EvaluateLeadDto } from './dto/rule.dto';

@ApiTags('Rules')
@Controller('rules')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RulesController {
  constructor(private svc: RulesService) {}

  @Get() @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER')
  findAll(@Query('category') category?: string) { return this.svc.findAll(category); }

  @Post() @Roles('OWNER', 'ADMIN', 'MANAGER')
  create(@Body() d: any) { return this.svc.create(d); }

  @Get(':id') @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER')
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Patch(':id') @Roles('OWNER', 'ADMIN', 'MANAGER')
  update(@Param('id') id: string, @Body() d: any) { return this.svc.update(id, d); }

  @Delete(':id') @Roles('OWNER', 'ADMIN')
  remove(@Param('id') id: string) { return this.svc.remove(id); }

  @Post('test') @Roles('OWNER', 'ADMIN', 'MANAGER')
  test(@Body() d: TestRuleDto) {
    return this.svc.testConditions(d.conditions, d.testLead);
  }

  @Post('evaluate-lead') @Roles('OWNER', 'ADMIN', 'MANAGER')
  evaluateLead(@Body() d: EvaluateLeadDto) {
    return this.svc.evaluateLead(d.lead, d.ruleId);
  }
}

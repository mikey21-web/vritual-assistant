import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ScoringRulesService } from './scoring-rules.service';
import { CreateScoringRuleDto, UpdateScoringRuleDto } from './dto/scoring-routing.dto';
import { PaginationDto } from '../shared/dto/pagination.dto';

@ApiTags('Scoring Rules')
@Controller('scoring-rules')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ScoringRulesController {
  constructor(private service: ScoringRulesService) {}

  @Get() @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER') findAll(@Query() q: PaginationDto) { return this.service.findAll(q); }
  @Post() @Roles('OWNER', 'ADMIN', 'MANAGER') create(@Body() d: CreateScoringRuleDto) { return this.service.create(d); }
  @Patch(':id') @Roles('OWNER', 'ADMIN', 'MANAGER') update(@Param('id') id: string, @Body() d: UpdateScoringRuleDto) { return this.service.update(id, d); }
  @Delete(':id') @Roles('OWNER', 'ADMIN') remove(@Param('id') id: string) { return this.service.remove(id); }
  @Post('test') @Roles('OWNER', 'ADMIN', 'MANAGER') test(@Body() d: { field: string; operator: string; value: string; points: number; testValues: Record<string, string>[] }) { return this.service.test(d); }
}

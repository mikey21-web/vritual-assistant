import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CustomFieldsService } from './custom-fields.service';
import { CreateCustomFieldDto, UpdateCustomFieldDto, ReorderCustomFieldsDto } from './dto/custom-field.dto';

@ApiTags('Custom Fields')
@Controller('custom-fields')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CustomFieldsController {
  constructor(private service: CustomFieldsService) {}
  @Get('definitions') @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER') findAll(@Query() q: Record<string, string>) { return this.service.findAllDefinitions(q); }
  @Post('definitions') @Roles('OWNER', 'ADMIN', 'MANAGER') create(@Body() d: CreateCustomFieldDto) { return this.service.createDefinition(d); }
  @Patch('definitions/:id') @Roles('OWNER', 'ADMIN', 'MANAGER') update(@Param('id') id: string, @Body() d: UpdateCustomFieldDto) { return this.service.updateDefinition(id, d); }
  @Delete('definitions/:id') @Roles('OWNER', 'ADMIN') remove(@Param('id') id: string) { return this.service.removeDefinition(id); }
  @Patch('reorder') @Roles('OWNER', 'ADMIN') reorder(@Body() d: ReorderCustomFieldsDto) { return this.service.reorder(d.ids); }
  @Get('values/:target/:targetId') @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER') getValues(@Param('target') target: string, @Param('targetId') targetId: string) { return this.service.getValues(target, targetId); }
  @Post('values/:target/:targetId') @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT') setValues(@Param('target') target: string, @Param('targetId') targetId: string, @Body() d: { values: { definitionId: string; value: string }[] }) { return this.service.setValues(target, targetId, d.values); }
}

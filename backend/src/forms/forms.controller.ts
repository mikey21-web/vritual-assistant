import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';
import { FormsService } from './forms.service';
import { CreateFormDto, UpdateFormDto, CreateFormFieldDto, SubmitFormDto } from './dto/form.dto';
import { UpdateFormFieldDto } from './dto/update-form-field.dto';

@ApiTags('Forms')
@Controller('forms')
export class FormsController {
  constructor(private service: FormsService) {}

  @Get() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER')
  @ApiBearerAuth() findAll() { return this.service.findAll(); }

  @Post() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiBearerAuth() create(@Body() d: CreateFormDto, @Req() req) { return this.service.create(d, req.user.sub); }

  @Get(':id') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER')
  @ApiBearerAuth() findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Patch(':id') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiBearerAuth() update(@Param('id') id: string, @Body() d: UpdateFormDto, @Req() req) { return this.service.update(id, d, req.user.sub); }

  @Post(':id/fields') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiBearerAuth() addField(@Param('id') id: string, @Body() d: CreateFormFieldDto) { return this.service.addField(id, d); }

  @Patch(':id/fields/:fieldId') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiBearerAuth() updateField(@Param('id') id: string, @Param('fieldId') fieldId: string, @Body() d: UpdateFormFieldDto) { return this.service.updateField(id, fieldId, d); }

  @Delete(':id/fields/:fieldId') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiBearerAuth() deleteField(@Param('id') id: string, @Param('fieldId') fieldId: string) { return this.service.deleteField(id, fieldId); }

  @Public()
  @Post(':id/submit') @ApiOperation({ summary: 'Submit form (public)' }) submit(@Param('id') id: string, @Body() d: SubmitFormDto) { return this.service.submit(id, d); }
}

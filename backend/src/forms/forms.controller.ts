import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';
import { FormsService } from './forms.service';
import {
  CreateFormDto,
  UpdateFormDto,
  CreateFormFieldDto,
  SubmitFormDto,
  FormSubmissionsQueryDto,
  FormAnalyticsDto,
} from './dto/form.dto';
import { UpdateFormFieldDto } from './dto/update-form-field.dto';

@ApiTags('Forms')
@Controller('forms')
export class FormsController {
  constructor(private service: FormsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER')
  @ApiBearerAuth()
  findAll() { return this.service.findAll(); }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiBearerAuth()
  create(@Body() d: CreateFormDto, @Req() req) { return this.service.create(d, req.user.sub); }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER')
  @ApiBearerAuth()
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiBearerAuth()
  update(@Param('id') id: string, @Body() d: UpdateFormDto, @Req() req) { return this.service.update(id, d, req.user.sub); }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles('OWNER', 'ADMIN')
  @ApiBearerAuth()
  remove(@Param('id') id: string, @Req() req) { return this.service.remove(id, req.user.sub); }

  @Post(':id/fields')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiBearerAuth()
  addField(@Param('id') id: string, @Body() d: CreateFormFieldDto) { return this.service.addField(id, d); }

  @Post(':id/fields/bulk')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk create fields (replaces all existing fields)' })
  addFieldsBulk(@Param('id') id: string, @Body() dto: { fields: CreateFormFieldDto[]; steps?: any[] }) { return this.service.addFieldsBulk(id, dto.fields, dto.steps); }

  @Patch(':id/fields/:fieldId')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiBearerAuth()
  updateField(@Param('id') id: string, @Param('fieldId') fieldId: string, @Body() d: UpdateFormFieldDto) { return this.service.updateField(id, fieldId, d); }

  @Delete(':id/fields/:fieldId')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiBearerAuth()
  deleteField(@Param('id') id: string, @Param('fieldId') fieldId: string) { return this.service.deleteField(id, fieldId); }

  // ── Public endpoints ───────────────────────────────────────────────────────

  /** Returns form config for public embed rendering (no auth required). */
  @Public()
  @Get(':id/public')
  @ApiOperation({ summary: 'Get form config for public embed (no auth)' })
  findOnePublic(@Param('id') id: string) { return this.service.findOnePublic(id); }

  /** Accepts a form submission from the public embed. */
  @Public()
  @Post(':id/submit')
  @ApiBody({ type: SubmitFormDto })
  @ApiOperation({ summary: 'Submit form data (public, accepts dynamic form fields)' })
  submit(@Param('id') id: string, @Body() d: any, @Req() req) { return this.service.submit(id, d, req); }

  // ── Authenticated endpoints ─────────────────────────────────────────────────

  @Get(':id/submissions')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List form submissions with lead info (paginated)' })
  findSubmissions(
    @Param('id') id: string,
    @Query() q: FormSubmissionsQueryDto,
  ) { return this.service.findSubmissions(id, q); }

  @Get(':id/analytics')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get form analytics (completion rate, source breakdown, trends)' })
  getAnalytics(@Param('id') id: string) { return this.service.getAnalytics(id); }
}

import { Controller, Get, Post, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { MessageTemplatesService } from './message-templates.service';
import { CreateTemplateDto, UpdateTemplateDto } from './dto/template.dto';

@ApiTags('Message Templates')
@Controller('message-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MessageTemplatesController {
  constructor(private service: MessageTemplatesService) {}

  @Get() @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER') findAll() { return this.service.findAll(); }
  @Post() @Roles('OWNER', 'ADMIN', 'MANAGER') create(@Body() d: CreateTemplateDto, @Req() req) { return this.service.create({...d, creatorId: req.user.sub}, req.user.sub); }
  @Get(':id') @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Patch(':id') @Roles('OWNER', 'ADMIN', 'MANAGER') update(@Param('id') id: string, @Body() d: UpdateTemplateDto, @Req() req) { return this.service.update(id, d, req.user.sub); }
  @Post(':id/preview') @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER') preview(@Param('id') id: string, @Body() vars: Record<string, string>) { return this.service.preview(id, vars); }
}

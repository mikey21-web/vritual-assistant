import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from '../shared/dto/misc.dto';
import { PaginationDto } from '../shared/dto/pagination.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { UpdateMemoryDto } from './dto/update-memory.dto';

@ApiTags('Contacts')
@Controller('contacts')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ContactsController {
  constructor(private service: ContactsService) {}

  @Get() @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT') findAll(@Query() q: PaginationDto) { return this.service.findAll(q); }
  @Post() @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT') create(@Body() d: CreateContactDto, @Req() req) { return this.service.create(d, req); }
  @Get(':id') @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT', 'VIEWER') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Patch(':id') @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT') update(@Param('id') id: string, @Body() d: UpdateContactDto) { return this.service.update(id, d); }
  @Delete(':id') @Roles('OWNER', 'ADMIN') remove(@Param('id') id: string) { return this.service.remove(id); }

  // Cross-channel, cross-time memory the agent reads/writes so it recognizes
  // a returning contact regardless of which channel or lead they came in on.
  @Get(':id/memory') @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT', 'VIEWER') getMemory(@Param('id') id: string) { return this.service.getMemory(id); }
  @Patch(':id/memory') @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT') updateMemory(@Param('id') id: string, @Body() d: UpdateMemoryDto) { return this.service.updateMemory(id, d); }
}

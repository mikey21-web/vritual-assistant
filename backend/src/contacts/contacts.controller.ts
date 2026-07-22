import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from '../shared/dto/misc.dto';
import { PaginationDto } from '../shared/dto/pagination.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@ApiTags('Contacts')
@Controller('contacts')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ContactsController {
  constructor(private service: ContactsService) {}

  @Get() @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT') findAll(@Query() q: PaginationDto, @Req() req) { return this.service.findAll(q, req.user?.tenantId); }
  @Post() @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT') create(@Body() d: CreateContactDto, @Req() req) { return this.service.create(d as any, req); }
  @Get(':id') @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT', 'VIEWER') findOne(@Param('id') id: string, @Req() req) { return this.service.findOne(id, req.user?.tenantId); }
  @Patch(':id') @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT') update(@Param('id') id: string, @Body() d: UpdateContactDto, @Req() req) { return this.service.update(id, d, req.user?.tenantId); }
  @Delete(':id') @Roles('OWNER', 'ADMIN') remove(@Param('id') id: string, @Req() req) { return this.service.remove(id, req.user?.tenantId); }
}

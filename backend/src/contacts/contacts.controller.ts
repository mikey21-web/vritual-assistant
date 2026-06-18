import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
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

  @Get() @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT', 'VIEWER') findAll(@Query() q: PaginationDto, @Req() req) { return this.service.findAll({ ...q, tenantId: req.user?.tenantId }); }
  @Post() @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT') create(@Body() d: CreateContactDto) { return this.service.create(d); }
  @Get(':id') @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT', 'VIEWER') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Patch(':id') @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT') update(@Param('id') id: string, @Body() d: UpdateContactDto) { return this.service.update(id, d); }
}

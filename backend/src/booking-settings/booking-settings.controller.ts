import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { BookingSettingsService } from './booking-settings.service';
import { CreateBookingSettingDto } from '../shared/dto/misc.dto';
import { PaginationDto } from '../shared/dto/pagination.dto';
import { UpdateBookingSettingDto } from './dto/update-booking-setting.dto';

@ApiTags('Booking Settings')
@Controller('booking-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class BookingSettingsController {
  constructor(private service: BookingSettingsService) {}
  @Get() @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER') findAll(@Query() q: PaginationDto) { return this.service.findAll(q); }
  @Post() @Roles('OWNER', 'ADMIN', 'MANAGER') create(@Body() d: CreateBookingSettingDto) { return this.service.create(d); }
  @Patch(':id') @Roles('OWNER', 'ADMIN', 'MANAGER') update(@Param('id') id: string, @Body() d: UpdateBookingSettingDto) { return this.service.update(id, d); }
  @Post(':id/test') @Roles('OWNER', 'ADMIN', 'MANAGER') test(@Param('id') id: string) { return this.service.test(id); }
}

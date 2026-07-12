import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { BookingsService } from './bookings.service';
import { CreateBookingDto, RescheduleBookingDto, CancelBookingDto } from './dto/booking.dto';

@ApiTags('Bookings')
@Controller('leads')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class BookingsController {
  constructor(private service: BookingsService) {}

  @Get(':id/bookings') @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT', 'VIEWER')
  findByLead(@Param('id') id: string) { return this.service.findByLead(id); }

  @Get(':id/bookings/availability') @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT', 'VIEWER')
  availability(@Param('id') id: string) { return this.service.getAvailability(id); }

  @Post(':id/bookings') @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  book(@Param('id') id: string, @Body() d: CreateBookingDto) { return this.service.bookForLead(id, d.bookingType); }

  @Post(':id/bookings/reschedule') @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  reschedule(@Param('id') id: string, @Body() d: RescheduleBookingDto) { return this.service.reschedule(id, d.newTime, d.reason); }

  @Post(':id/bookings/cancel') @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  cancel(@Param('id') id: string, @Body() d: CancelBookingDto) { return this.service.cancel(id, d.reason); }
}

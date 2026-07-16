import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { BookingLifecycleService } from './booking-lifecycle.service';

@Module({
  controllers: [BookingsController],
  providers: [BookingsService, BookingLifecycleService],
  exports: [BookingsService, BookingLifecycleService],
})
export class BookingsModule {}

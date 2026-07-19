import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { BookingLifecycleService } from './booking-lifecycle.service';
import { BookingConfirmationService } from './booking-confirmation.service';

@Module({
  controllers: [BookingsController],
  providers: [BookingsService, BookingLifecycleService, BookingConfirmationService],
  exports: [BookingsService, BookingLifecycleService, BookingConfirmationService],
})
export class BookingsModule {}

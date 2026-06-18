import { Module } from '@nestjs/common';
import { BookingSettingsService } from './booking-settings.service';
import { BookingSettingsController } from './booking-settings.controller';

@Module({
  controllers: [BookingSettingsController],
  providers: [BookingSettingsService],
  exports: [BookingSettingsService],
})
export class BookingSettingsModule {}

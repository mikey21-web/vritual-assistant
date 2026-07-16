import { Module } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module';
import { PaymentSchedulesService } from './payment-schedules.service';
import { PaymentSchedulesController } from './payment-schedules.controller';

@Module({
  imports: [BookingsModule],
  controllers: [PaymentSchedulesController],
  providers: [PaymentSchedulesService],
  exports: [PaymentSchedulesService],
})
export class PaymentSchedulesModule {}

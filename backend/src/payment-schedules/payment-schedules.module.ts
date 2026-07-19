import { Module } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module';
import { PaymentSchedulesService } from './payment-schedules.service';
import { PaymentSchedulesController } from './payment-schedules.controller';
import { PaymentPlanTemplatesService } from './payment-plan-templates.service';
import { PaymentPlanTemplatesController } from './payment-plan-templates.controller';

@Module({
  imports: [BookingsModule],
  controllers: [PaymentSchedulesController, PaymentPlanTemplatesController],
  providers: [PaymentSchedulesService, PaymentPlanTemplatesService],
  exports: [PaymentSchedulesService, PaymentPlanTemplatesService],
})
export class PaymentSchedulesModule {}

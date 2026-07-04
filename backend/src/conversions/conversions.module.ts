import { Module } from '@nestjs/common';
import { ConversionsService } from './conversions.service';
import { ConversionsController } from './conversions.controller';
import { QuoteRequestService } from './quote-request.service';
import { QuoteRequestController } from './quote-request.controller';
import { OrderBookingService } from './order-booking.service';
import { OrderBookingController } from './order-booking.controller';
import { MemberRegistrationService } from './member-registration.service';
import { MemberRegistrationController } from './member-registration.controller';

@Module({
  controllers: [ConversionsController, QuoteRequestController, OrderBookingController, MemberRegistrationController],
  providers: [ConversionsService, QuoteRequestService, OrderBookingService, MemberRegistrationService],
  exports: [ConversionsService, QuoteRequestService, OrderBookingService, MemberRegistrationService],
})
export class ConversionsModule {}

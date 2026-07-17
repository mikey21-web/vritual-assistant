import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString, IsIn } from 'class-validator';
import { CreateBookingDto } from './create-booking.dto';

export class UpdateBookingDto extends PartialType(CreateBookingDto) {
  // These previously had no validation decorators, so the global
  // ValidationPipe's whitelist silently dropped them from every request —
  // cancelling, rescheduling status, and payment-link/status updates were
  // all no-ops with no error surfaced to the caller.
  @IsOptional() @IsIn(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW']) status?: string;
  @IsOptional() @IsString() paymentLink?: string;
  @IsOptional() @IsString() paymentStatus?: string;
  @IsOptional() @IsString() notes?: string;
}

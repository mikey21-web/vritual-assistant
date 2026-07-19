import { IsString } from 'class-validator';

export class RequestBuyerMagicLinkDto {
  @IsString()
  bookingNumber: string;

  /** Phone or email on file for the booking's primary contact — must match before a link is issued. */
  @IsString()
  contactHint: string;
}

export class VerifyBuyerMagicLinkDto {
  @IsString()
  token: string;
}

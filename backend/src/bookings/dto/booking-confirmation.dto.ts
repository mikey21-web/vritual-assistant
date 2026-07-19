import { IsString, IsOptional, IsArray, ValidateNested, IsInt, IsBoolean, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePurchaseBookingDto {
  @IsString()
  leadId: string;

  @IsString()
  unitId: string;

  @IsString()
  costSheetId: string;
}

export class BookingApplicantDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  contactId?: string;

  @IsOptional()
  @IsString()
  panMasked?: string;

  @IsOptional()
  addressSnapshot?: Record<string, unknown>;

  @IsOptional()
  @IsIn(['PRIMARY', 'CO_APPLICANT'])
  role?: 'PRIMARY' | 'CO_APPLICANT';
}

export class ConfirmBookingDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingApplicantDto)
  applicants: BookingApplicantDto[];

  @IsInt()
  bookingAmountPaise: number;

  @IsOptional()
  @IsBoolean()
  overrideMissingHold?: boolean;
}

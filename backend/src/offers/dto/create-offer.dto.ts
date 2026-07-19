import { IsString, IsOptional, IsInt, IsNumber, IsDateString } from 'class-validator';

export class CreateOfferDto {
  @IsString()
  costSheetId: string;

  @IsOptional()
  @IsInt()
  discountPaise?: number;

  @IsOptional()
  @IsNumber()
  discountPercent?: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

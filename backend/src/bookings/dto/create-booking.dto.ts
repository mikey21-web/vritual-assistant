import { IsString, IsOptional, IsDateString, IsNumber } from 'class-validator';

export class CreateBookingDto {
  @IsString()
  leadId: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  startTime: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  propertyId?: string;
}

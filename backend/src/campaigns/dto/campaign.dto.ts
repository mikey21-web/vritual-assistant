import { IsString, IsEmail, IsOptional, IsArray, IsBoolean, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCampaignDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() sourceType: string;
  @ApiPropertyOptional() @IsOptional() @IsString() offer?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() landingUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() conversionGoal?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() crmDestination?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bookingDestination?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() utmSource?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() utmMedium?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() utmCampaign?: string;
}

export class UpdateCampaignDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() offer?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() landingUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endDate?: string;
}

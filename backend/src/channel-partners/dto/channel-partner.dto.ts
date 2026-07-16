import { IsString, IsOptional, IsNumber, IsIn, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateChannelPartnerDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() company?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reraId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() commissionRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateChannelPartnerDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() company?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reraId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() commissionRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsIn(['ACTIVE', 'INACTIVE', 'SUSPENDED']) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class AllocateLeadDto {
  @ApiProperty() @IsString() leadId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() partnerId?: string | null;
}

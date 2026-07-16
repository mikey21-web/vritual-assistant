import { IsString, IsOptional, IsNumber, IsIn, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaymentScheduleDto {
  @ApiProperty() @IsString() leadId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bookingId?: string;
  @ApiProperty() @IsString() label: string;
  @ApiProperty() @IsNumber() amount: number;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dueDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdatePaymentScheduleDto {
  @ApiPropertyOptional() @IsOptional() @IsString() label?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() amount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dueDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(['PENDING', 'PAID', 'OVERDUE', 'WAIVED']) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

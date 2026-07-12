import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty() @IsString() bookingType: string;
}

export class RescheduleBookingDto {
  @ApiProperty({ description: 'New appointment time as an ISO 8601 datetime' }) @IsString() newTime: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

export class CancelBookingDto {
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

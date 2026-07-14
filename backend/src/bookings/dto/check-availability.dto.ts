import { IsDateString, IsOptional, IsInt, Min } from 'class-validator';

export class CheckAvailabilityDto {
  @IsDateString()
  startTime: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  @IsInt()
  @Min(15)
  durationMinutes?: number;
}

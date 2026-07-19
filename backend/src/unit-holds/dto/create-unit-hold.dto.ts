import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';

export class CreateUnitHoldDto {
  @IsString()
  unitId: string;

  @IsString()
  leadId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24 * 14)
  holdHours?: number;
}

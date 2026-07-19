import { IsString, IsOptional, IsInt, IsDateString } from 'class-validator';

export class CreateApprovalRequestDto {
  @IsString()
  type: string;

  @IsString()
  entityType: string;

  @IsString()
  entityId: string;

  @IsOptional()
  @IsInt()
  amountPaise?: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

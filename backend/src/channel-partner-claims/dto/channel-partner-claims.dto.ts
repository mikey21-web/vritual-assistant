import { IsString, IsOptional, IsInt } from 'class-validator';

export class RegisterLeadClaimDto {
  @IsString()
  channelPartnerId: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  leadId?: string;
}

export class CreateCommissionAccrualDto {
  @IsString()
  channelPartnerId: string;

  @IsOptional()
  @IsString()
  bookingId?: string;

  @IsOptional()
  @IsString()
  planId?: string;

  @IsInt()
  amountPaise: number;
}

export class CreatePayoutDto {
  @IsString()
  channelPartnerId: string;

  accrualIds: string[];
}

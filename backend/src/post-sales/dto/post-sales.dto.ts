import { IsString, IsOptional, IsIn } from 'class-validator';

const STAGES = [
  'BOOKING_CONFIRMED', 'KYC_IN_PROGRESS', 'ALLOTMENT_ISSUED', 'AGREEMENT_IN_PROGRESS',
  'AGREEMENT_REGISTERED', 'PAYMENT_ACTIVE', 'PRE_POSSESSION', 'POSSESSION_OFFERED',
  'HANDED_OVER', 'POST_POSSESSION_SUPPORT',
];

export class AdvanceStageDto {
  @IsIn(STAGES)
  toStage: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

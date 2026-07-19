import { IsString, IsIn, IsArray, ValidateNested, IsNumber, IsOptional, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

class MilestoneDto {
  @IsString()
  label: string;

  @IsNumber()
  percentage: number;

  @IsOptional()
  @IsInt()
  dueOffsetDays?: number;

  @IsOptional()
  @IsString()
  triggerNote?: string;
}

export class CreatePaymentPlanTemplateDto {
  @IsString()
  name: string;

  @IsIn(['CONSTRUCTION_LINKED', 'TIME_LINKED', 'DOWN_PAYMENT', 'SUBVENTION', 'CUSTOM'])
  planType: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MilestoneDto)
  milestones: MilestoneDto[];
}

export class GeneratePaymentScheduleDto {
  @IsString()
  templateId: string;

  @IsString()
  leadId: string;

  @IsString()
  bookingId: string;

  @IsNumber()
  totalAmount: number;
}

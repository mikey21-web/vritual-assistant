import { IsString, IsOptional, IsInt, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PaymentAllocationDto {
  @IsString()
  paymentScheduleId: string;

  @IsInt()
  amountPaise: number;
}

export class RecordPaymentReceiptDto {
  @IsString()
  leadId: string;

  @IsOptional()
  @IsString()
  bookingId?: string;

  @IsOptional()
  @IsString()
  externalRef?: string;

  @IsInt()
  amountPaise: number;

  @IsString()
  mode: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentAllocationDto)
  allocations?: PaymentAllocationDto[];
}

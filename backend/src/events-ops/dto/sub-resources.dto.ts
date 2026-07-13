import { IsString, IsOptional, IsIn, IsDateString, IsNumber, IsBoolean, IsArray } from 'class-validator';

export class CreateFunctionDto {
  @IsString() name!: string;
  @IsDateString() @IsOptional() startAt?: string;
}

export class CreateMoodboardIdeaDto {
  @IsString() title!: string;
  @IsString() @IsOptional() functionId?: string;
  @IsString() @IsOptional() imageUrl?: string;
  @IsIn(['OPEN', 'CONSIDERING', 'FINALIZED', 'ARCHIVED']) @IsOptional() status?: string;
}

export class AssignTeamDto {
  @IsString() userId!: string;
  @IsString() @IsOptional() role?: string;
}

export class AssignVendorDto {
  @IsString() partnerId!: string;
  @IsString() @IsOptional() roleOnEvent?: string;
}

export class CreateEventFileDto {
  @IsString() fileUrl!: string;
  @IsString() name!: string;
  @IsIn(['INTERNAL', 'SHARED']) @IsOptional() visibility?: string;
}

export class CreateEventExpenseDto {
  @IsString() description!: string;
  @IsString() @IsOptional() category?: string;
  @IsNumber() amount!: number;
  @IsNumber() @IsOptional() gstPercent?: number;
  @IsBoolean() @IsOptional() billableToClient?: boolean;
  @IsString() @IsOptional() receiptUrl?: string;
  @IsDateString() @IsOptional() expenseDate?: string;
}

export class CreatePaymentMilestoneDto {
  @IsString() label!: string;
  @IsNumber() amount!: number;
  @IsDateString() @IsOptional() dueDate?: string;
}

export class CreateRunSheetItemDto {
  @IsString() title!: string;
  @IsDateString() @IsOptional() time?: string;
  @IsString() @IsOptional() notes?: string;
}

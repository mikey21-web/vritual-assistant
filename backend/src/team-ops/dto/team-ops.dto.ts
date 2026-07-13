import { IsString, IsOptional, IsIn, IsNumber, IsDateString, IsBoolean } from 'class-validator';

export class CreateLeaveRequestDto {
  @IsString() userId!: string;
  @IsDateString() startDate!: string;
  @IsDateString() endDate!: string;
}

export class UpdateLeaveRequestDto {
  @IsIn(['PENDING', 'APPROVED', 'REJECTED']) status!: string;
  @IsString() @IsOptional() approvedById?: string;
}

export class CreateSalaryRecordDto {
  @IsString() userId!: string;
  @IsString() month!: string;
  @IsNumber() amount!: number;
  @IsIn(['SALARY', 'ADVANCE']) @IsOptional() type?: string;
}

export class CreateTimesheetEntryDto {
  @IsString() userId!: string;
  @IsString() eventId!: string;
  @IsString() @IsOptional() role?: string;
  @IsDateString() date!: string;
  @IsNumber() hours!: number;
  @IsNumber() @IsOptional() overtime?: number;
}

export class UpdateTeamMemberDto {
  @IsString() @IsOptional() department?: string;
  @IsIn(['Monthly', 'Daily', 'Per event']) @IsOptional() salaryType?: string;
  @IsNumber() @IsOptional() monthlySalary?: number;
  @IsDateString() @IsOptional() joinedDate?: string;
  @IsNumber() @IsOptional() annualLeaveQuota?: number;
  @IsString() @IsOptional() teamStatus?: string;
}

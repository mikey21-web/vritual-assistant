import { IsString, IsOptional, IsObject, IsIn, IsNumber, IsInt, IsArray, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCrmMappingDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() crmType: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() fieldMappings?: Record<string, unknown>;
}

export class CreateBookingSettingDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() provider: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() config?: Record<string, unknown>;
}

export class CreateQrCodeDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() destinationType: string;
  @ApiProperty() @IsString() destination: string;
}

export class CreateUserDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() email: string;
  @ApiPropertyOptional() @IsOptional() @IsString() password?: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(['OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT', 'VIEWER']) role?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() department?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() salaryType?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() monthlySalary?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() joinedDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) skills?: string[];
  @ApiPropertyOptional() @IsOptional() @IsInt() annualLeaveQuota?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() teamStatus?: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() password?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() department?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() salaryType?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() monthlySalary?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() joinedDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) skills?: string[];
  @ApiPropertyOptional() @IsOptional() @IsInt() annualLeaveQuota?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() teamStatus?: string;
}

export class CreateContactDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() company?: string;
}

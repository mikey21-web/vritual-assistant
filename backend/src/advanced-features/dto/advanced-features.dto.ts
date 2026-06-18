import { IsString, IsOptional, IsNumber, IsBoolean, IsObject, IsEnum, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePipelineStageDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() order?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() color?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() isDefault?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() isEnd?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdatePipelineStageDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() name?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() order?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() color?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() isDefault?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() isEnd?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() active?: boolean;
}

export class CreateSavedFilterDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() entity: string;
  @ApiProperty() @IsObject() filters: Record<string, unknown>;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() isShared?: boolean;
}

export class UpdateNotificationPrefsDto {
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() leadHot?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() leadAssigned?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() messageReceived?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() dailySummary?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() webhookFailure?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() slaBreach?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsArray() channels?: string[];
}

export class CreateSlaRuleDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsObject() condition: Record<string, unknown>;
  @ApiProperty() @IsNumber() responseTimeMinutes: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() escalationUserId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() escalationAfterMinutes?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdateSlaRuleDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() name?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsObject() condition?: Record<string, unknown>;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() responseTimeMinutes?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() escalationUserId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() escalationAfterMinutes?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() active?: boolean;
}

export class CreateRevenueDto {
  @ApiProperty() @IsString() leadId: string;
  @ApiProperty() @IsNumber() amount: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() currency?: string;
  @ApiProperty() @IsString() type: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() status?: string;
}

export class RevenueQueryDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() leadId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() startDate?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() endDate?: string;
}

export class MergeContactsDto {
  @ApiProperty() @IsString() primaryId: string;
  @ApiProperty() @IsString() secondaryId: string;
}

export class CreateBlocklistDto {
  @ApiProperty() @IsString() type: string;
  @ApiProperty() @IsString() value: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() reason?: string;
}

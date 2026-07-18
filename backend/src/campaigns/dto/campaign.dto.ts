import {
  IsString, IsOptional, IsArray, IsBoolean, IsDateString, IsInt, IsObject, IsNumber, IsIn, Min, Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

const CAMPAIGN_STATUSES = ['draft', 'active', 'paused', 'completed', 'archived'] as const;

export class CreateCampaignDto {
  @ApiProperty() @IsString() name: string;
  // Optional — the campaign wizard doesn't expose a "lead source" concept to
  // the user, so this defaults to 'CAMPAIGN' server-side when omitted.
  @ApiPropertyOptional() @IsOptional() @IsString() sourceType?: string;

  @ApiPropertyOptional({ default: 'multi-channel' }) @IsOptional() @IsString() campaignType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ default: 'draft' })
  @IsOptional() @IsString() @IsIn(CAMPAIGN_STATUSES)
  status?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() offer?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() landingUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() conversionGoal?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() crmDestination?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bookingDestination?: string;

  @ApiPropertyOptional() @IsOptional() @IsObject() budget?: Record<string, any>;
  @ApiPropertyOptional() @IsOptional() @IsObject() targeting?: Record<string, any>;
  @ApiPropertyOptional() @IsOptional() @IsArray() channels?: any[];
  @ApiPropertyOptional() @IsOptional() @IsArray() creatives?: any[];

  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(100) priority?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() totalBudget?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() dailyBudget?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endDate?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() utmSource?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() utmMedium?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() utmCampaign?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() utmTerm?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() utmContent?: string;
}

export class UpdateCampaignDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sourceType?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() campaignType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @IsIn(CAMPAIGN_STATUSES) status?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() offer?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() landingUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() conversionGoal?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() crmDestination?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bookingDestination?: string;

  @ApiPropertyOptional() @IsOptional() @IsObject() budget?: Record<string, any>;
  @ApiPropertyOptional() @IsOptional() @IsObject() targeting?: Record<string, any>;
  @ApiPropertyOptional() @IsOptional() @IsArray() channels?: any[];
  @ApiPropertyOptional() @IsOptional() @IsArray() creatives?: any[];

  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(100) priority?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() totalBudget?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() dailyBudget?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endDate?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() utmSource?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() utmMedium?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() utmCampaign?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() utmTerm?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() utmContent?: string;
}

export class CampaignFilterDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @IsIn(CAMPAIGN_STATUSES) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() campaignType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sourceType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() @Type(() => Boolean) active?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;

  @ApiPropertyOptional({ default: 'createdAt' })
  @IsOptional()
  @IsString()
  @IsIn([
    'createdAt', 'name', 'totalLeads', 'totalBudget', 'totalSpend',
    'roi', 'priority', 'campaignType', 'status', 'costPerLead',
  ])
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ default: 'desc' })
  @IsOptional() @IsString() @IsIn(['asc', 'desc'])
  sortOrder?: string = 'desc';
}

import { IsString, IsEmail, IsOptional, IsEnum, IsArray, IsObject, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLeadDto {
  @ApiProperty() @IsString() contactId: string;
  @ApiProperty({ enum: ['CAMPAIGN','QR_CODE','FORM','CHATBOT','MOBILE_APP','WHATSAPP','SOCIAL_MEDIA','PHONE_CALL'] })
  @IsIn(['CAMPAIGN','QR_CODE','FORM','CHATBOT','MOBILE_APP','WHATSAPP','SOCIAL_MEDIA','PHONE_CALL'])
  source: string;
  @ApiPropertyOptional() @IsOptional() @IsString() interest?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() budget?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() urgency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() message?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() campaignId?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class UpdateLeadDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() segment?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() interest?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() budget?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() urgency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() message?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
}

export class AssignLeadDto {
  @ApiPropertyOptional() @IsOptional() @IsString() agentId?: string;
}

export class LeadQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() segment?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() source?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() campaignId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() assignedAgentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
}

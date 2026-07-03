import { IsString, IsOptional, IsBoolean, IsInt, IsObject, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTemplateDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty({ enum: ['WELCOME', 'QUALIFICATION_QUESTION', 'FOLLOW_UP', 'RECONNECT', 'APPOINTMENT_LINK', 'QUOTE_REQUEST', 'PAYMENT_LINK', 'CRM_CONFIRMATION', 'DIGITAL_DOWNLOAD', 'THANK_YOU'] }) @IsIn(['WELCOME', 'QUALIFICATION_QUESTION', 'FOLLOW_UP', 'RECONNECT', 'APPOINTMENT_LINK', 'QUOTE_REQUEST', 'PAYMENT_LINK', 'CRM_CONFIRMATION', 'DIGITAL_DOWNLOAD', 'THANK_YOU']) type: string;
  @ApiProperty({ enum: ['WHATSAPP', 'EMAIL', 'SMS', 'CHATBOT', 'SOCIAL_DM', 'PHONE_CALL', 'SYSTEM', 'TELEGRAM'] }) @IsIn(['WHATSAPP', 'EMAIL', 'SMS', 'CHATBOT', 'SOCIAL_DM', 'PHONE_CALL', 'SYSTEM', 'TELEGRAM']) channel: string;
  @ApiProperty() @IsString() body: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() variables?: Record<string, unknown>;
}

export class UpdateTemplateDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() body?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() variables?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
}

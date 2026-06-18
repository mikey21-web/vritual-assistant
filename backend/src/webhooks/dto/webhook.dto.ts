import { IsString, IsOptional, IsEmail, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WebhookPayloadDto {
  @ApiProperty({ description: 'Raw webhook payload' })
  @IsObject()
  payload: Record<string, unknown>;
}

export class FormWebhookDto {
  @ApiPropertyOptional() @IsString() @IsOptional() name?: string;
  @ApiPropertyOptional() @IsEmail() @IsOptional() email?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() phone?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() message?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() campaignId?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() formId?: string;
  @ApiPropertyOptional() @IsObject() @IsOptional() metadata?: Record<string, unknown>;
}

export class WhatsAppWebhookDto {
  @ApiPropertyOptional() @IsObject() @IsOptional() entry?: unknown;
  @ApiPropertyOptional() @IsString() @IsOptional() object?: string;
}

export class GenericWebhookDto {
  @ApiPropertyOptional() @IsObject() @IsOptional() data?: unknown;
  @ApiPropertyOptional() @IsString() @IsOptional() event?: string;
}

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

export class WebchatMessageDto {
  @ApiProperty({ description: 'Public site key issued when Web Chat was enabled in the dashboard' }) @IsString() siteKey: string;
  @ApiProperty({ description: 'Widget-generated session id, stable for the visitor\'s browser session' }) @IsString() sessionId: string;
  @ApiProperty() @IsString() text: string;
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional({ description: 'Client-generated id for idempotent retries' }) @IsOptional() @IsString() messageId?: string;
}

export class TelegramWebhookDto {
  @ApiProperty() @IsOptional() update_id?: number;
  @ApiPropertyOptional() @IsOptional() @IsObject() message?: {
    message_id: number;
    from?: { id: number; first_name?: string; last_name?: string; username?: string };
    chat: { id: number; type: string; first_name?: string; username?: string };
    text?: string;
    date: number;
  };
}

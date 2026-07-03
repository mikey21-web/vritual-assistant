import { IsString, IsOptional, IsObject, IsIn, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateConversationMessageDto {
  @ApiProperty() @IsString() text: string;
  @ApiProperty({ enum: ['TELEGRAM','WHATSAPP','EMAIL','SMS','CHATBOT','SOCIAL_DM','PHONE_CALL','SYSTEM'] })
  @IsIn(['TELEGRAM','WHATSAPP','EMAIL','SMS','CHATBOT','SOCIAL_DM','PHONE_CALL','SYSTEM'])
  channel: string;
  @ApiProperty({ enum: ['INBOUND','OUTBOUND'] }) @IsIn(['INBOUND','OUTBOUND']) direction: string;
  @ApiProperty() @IsString() leadId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contactId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() providerMessageId?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class ConversationQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() leadId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() campaignId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() channel?: string;
}

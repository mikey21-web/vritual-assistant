import { IsString, IsIn, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CopilotMessageDto {
  @ApiProperty({ enum: ['user', 'assistant'] }) @IsIn(['user', 'assistant']) role: string;
  @ApiProperty() @IsString() text: string;
}

export class CopilotChatDto {
  @ApiProperty({ type: [CopilotMessageDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => CopilotMessageDto)
  messages: CopilotMessageDto[];

  @ApiPropertyOptional({ description: 'Scope the conversation to a specific lead' })
  @IsOptional() @IsString()
  leadId?: string;
}

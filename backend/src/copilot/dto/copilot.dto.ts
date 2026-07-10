import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatDto {
  @ApiProperty() @IsString() message: string;
  @ApiPropertyOptional() @IsOptional() @IsString() conversationId?: string;
}

export class ConfirmActionDto {
  @ApiProperty() @IsString() pendingActionId: string;
}

export class CopilotResponseDto {
  conversationId: string;
  reply: string;
  actions: CopilotActionDto[];
}

export class CopilotActionDto {
  tool: string;
  args: any;
  status: 'success' | 'error' | 'pending';
  result?: string;
  requiresConfirmation?: boolean;
  pendingActionId?: string;
}

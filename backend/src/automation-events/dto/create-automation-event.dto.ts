import { IsString, IsObject, IsOptional } from 'class-validator';

export class CreateAutomationEventDto {
  @IsString()
  type: string;

  @IsObject()
  @IsOptional()
  payload?: Record<string, unknown>;
}

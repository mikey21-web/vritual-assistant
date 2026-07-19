import { IsString, IsOptional, IsObject } from 'class-validator';

export class CreateJourneyDto {
  @IsString()
  name: string;

  @IsString()
  entryEventType: string;

  @IsOptional()
  @IsObject()
  entryConditions?: Record<string, any>;
}

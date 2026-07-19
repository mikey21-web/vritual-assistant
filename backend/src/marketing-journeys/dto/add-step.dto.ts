import { IsInt, IsEnum, IsOptional, IsObject } from 'class-validator';
import { JourneyStepType } from '@prisma/client';

export class AddStepDto {
  @IsInt()
  order: number;

  @IsEnum(JourneyStepType)
  stepType: JourneyStepType;

  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}

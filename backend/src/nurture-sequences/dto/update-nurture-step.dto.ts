import { IsString, IsNumber, IsObject, IsOptional } from 'class-validator';

export class UpdateNurtureStepDto {
  @IsNumber() @IsOptional() displayOrder?: number;
  @IsObject() @IsOptional() config?: Record<string, unknown>;
  @IsNumber() @IsOptional() waitSeconds?: number;
  @IsObject() @IsOptional() condition?: Record<string, unknown>;
  @IsString() @IsOptional() templateId?: string;
}

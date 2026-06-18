import { IsString, IsBoolean, IsObject, IsOptional } from 'class-validator';

export class UpdateCrmMappingDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() crmType?: string;
  @IsObject() @IsOptional() fieldMappings?: Record<string, unknown>;
  @IsBoolean() @IsOptional() active?: boolean;
}

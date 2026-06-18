import { IsString, IsBoolean, IsObject, IsOptional } from 'class-validator';

export class UpdateIntegrationDto {
  @IsString() @IsOptional() name?: string;
  @IsObject() @IsOptional() config?: Record<string, unknown>;
  @IsBoolean() @IsOptional() isActive?: boolean;
}

import { IsString, IsBoolean, IsObject, IsOptional } from 'class-validator';

export class UpdateRoutingRuleDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() description?: string;
  @IsObject() @IsOptional() conditions?: Record<string, unknown>;
  @IsObject() @IsOptional() action?: Record<string, unknown>;
  @IsBoolean() @IsOptional() active?: boolean;
}

import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class UpdateRoutingRuleDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() description?: string;
  // Conditions can be a single-condition object ({field: {operator,value}}) or
  // an array of {field,operator,value} for multi-condition rules — not validated
  // as a strict object since @IsObject() would reject the array shape.
  @IsOptional() conditions?: Record<string, unknown> | unknown[];
  @IsOptional() action?: Record<string, unknown>;
  @IsBoolean() @IsOptional() active?: boolean;
}

import { IsArray, IsObject, IsString, IsOptional } from 'class-validator';

export class TestRuleDto {
  @IsArray() conditions: unknown[];
  @IsObject() testLead: Record<string, unknown>;
}

export class EvaluateLeadDto {
  @IsObject() lead: Record<string, unknown>;
  @IsString() @IsOptional() ruleId?: string;
}

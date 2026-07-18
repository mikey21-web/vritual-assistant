import { IsString, IsOptional, IsBoolean, IsInt, IsObject, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateScoringRuleDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() field: string;
  @ApiProperty() @IsString() operator: string;
  @ApiProperty() @IsString() value: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() points: number;
}

export class UpdateScoringRuleDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() field?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() operator?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() value?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() points?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
}

export class CreateRoutingRuleDto {
  @ApiProperty() @IsString() name: string;
  // Conditions can be a single-condition object ({field: {operator,value}}) or
  // an array of {field,operator,value} for multi-condition rules — not validated
  // as a strict object since @IsObject() would reject the array shape.
  @ApiPropertyOptional() @IsOptional() conditions?: Record<string, unknown> | unknown[];
  @ApiPropertyOptional() @IsOptional() action?: Record<string, unknown>;
}

export class CreateTaskDto {
  @ApiProperty() @IsString() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() priority?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() leadId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() assigneeId?: string;
}

export class CreateConversionDto {
  @ApiProperty({ enum: ['CRM_QUALIFIED_PUSH', 'APPOINTMENT_BOOKING', 'QUOTE_REQUEST'] })
  @IsIn(['CRM_QUALIFIED_PUSH', 'APPOINTMENT_BOOKING', 'QUOTE_REQUEST'])
  destination: string;
  @ApiPropertyOptional() @IsOptional() @IsString() leadId?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class CreateIntegrationDto {
  @ApiProperty() @IsString() type: string;
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() config?: Record<string, unknown>;
}

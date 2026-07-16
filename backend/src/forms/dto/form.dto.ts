import { IsString, IsOptional, IsBoolean, IsArray, IsObject, IsNumber, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ── Form CRUD DTOs ───────────────────────────────────────────────────────────

export class CreateFormDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
  @ApiPropertyOptional({ description: 'Multi-step config: array of { id, title, description }' })
  @IsOptional() @IsArray() steps?: any[];
  @ApiPropertyOptional({ description: 'Embed config: { type, theme }' })
  @IsOptional() @IsObject() embedConfig?: Record<string, unknown>;
  @ApiPropertyOptional({ description: 'Post-submission config: { redirectUrl, confirmationMessage }' })
  @IsOptional() @IsObject() submissionConfig?: Record<string, unknown>;
  @ApiPropertyOptional({ description: 'Form type hint (custom, survey, booking, etc)', default: 'custom' })
  @IsOptional() @IsString() formType?: string;
}

export class UpdateFormDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsArray() steps?: any[];
  @ApiPropertyOptional() @IsOptional() @IsObject() embedConfig?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsObject() submissionConfig?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsString() formType?: string;
}

// ── Field DTOs ───────────────────────────────────────────────────────────────

export class CreateFormFieldDto {
  @ApiProperty() @IsString() label: string;
  @ApiProperty() @IsString() fieldKey: string;
  @ApiProperty() @IsString() type: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() required?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() placeholder?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() validation?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsArray() options?: string[];
  @ApiPropertyOptional({ description: 'Step this field belongs to (for multi-step forms)' })
  @IsOptional() @IsString() stepId?: string;
  @ApiPropertyOptional({ description: 'Conditional logic: { action, conditions: [...] }' })
  @IsOptional() @IsObject() conditionalLogic?: Record<string, unknown>;
  @ApiPropertyOptional({ description: 'Layout width: full | half | third', default: 'full' })
  @IsOptional() @IsString() width?: string;
}

// ── Submission DTO ───────────────────────────────────────────────────────────

export class SubmitFormDto {
  // Contact / lead fields
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() whatsapp?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() company?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() message?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() interest?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, unknown>;
  // Set by the form page when it was reached via a ?qr=<id> link, so the resulting
  // lead can be attributed to the QR code instead of just "FORM".
  @ApiPropertyOptional() @IsOptional() @IsString() qrCodeId?: string;

  // Submission metadata — prefixed with _ so they don't collide with dynamic form fields
  @ApiPropertyOptional({ description: 'Submission source (direct, embed, api, etc)' })
  @IsOptional() @IsString() _source?: string;
  @ApiPropertyOptional({ description: 'Page URL where the form was embedded / submitted from' })
  @IsOptional() @IsString() _pageUrl?: string;
  @ApiPropertyOptional({ description: 'UTM parameters from the landing page' })
  @IsOptional() @IsObject() _utm?: Record<string, unknown>;
  @ApiPropertyOptional({ description: 'ISO timestamp when the user started filling the form' })
  @IsOptional() @IsString() _startedAt?: string;
  @ApiPropertyOptional({ description: 'ISO timestamp when the user completed the form' })
  @IsOptional() @IsString() _completedAt?: string;
}

// ── Query DTOs ───────────────────────────────────────────────────────────────

export class FormSubmissionsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number = 20;

  @ApiPropertyOptional() @IsOptional() @IsString() source?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional({ description: 'Filter by completion status ("true" | "false")' })
  @IsOptional() @IsString() completed?: string;
  @ApiPropertyOptional({ description: 'Start date (ISO 8601)' })
  @IsOptional() @IsString() dateFrom?: string;
  @ApiPropertyOptional({ description: 'End date (ISO 8601)' })
  @IsOptional() @IsString() dateTo?: string;
}

// ── Analytics response type ──────────────────────────────────────────────────
// Not a body DTO — just a typed response shape for Swagger documentation.

export class SourceBreakdownEntry {
  @ApiProperty() source: string;
  @ApiProperty() count: number;
}

export class TrendEntry {
  @ApiProperty() date: string;
  @ApiProperty() count: number;
  @ApiProperty() completed: number;
}

export class FormAnalyticsDto {
  @ApiProperty() totalSubmissions: number;
  @ApiProperty({ description: 'Completion rate as a percentage (0–100)' })
  completionRate: number;
  @ApiProperty({ type: [SourceBreakdownEntry] })
  sourceBreakdown: SourceBreakdownEntry[];
  @ApiProperty({ description: 'Number of submissions that reached each step / field key' })
  fieldDropOff: Record<string, number>;
  @ApiProperty({ type: [TrendEntry] })
  trends: TrendEntry[];
}

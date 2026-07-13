import { IsString, IsOptional, IsBoolean, IsArray, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFormDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdateFormDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
}

export class CreateFormFieldDto {
  @ApiProperty() @IsString() label: string;
  @ApiProperty() @IsString() fieldKey: string;
  @ApiProperty() @IsString() type: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() required?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() placeholder?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() validation?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsArray() options?: string[];
}

export class SubmitFormDto {
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
}

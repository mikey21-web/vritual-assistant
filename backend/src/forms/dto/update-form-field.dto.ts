import { IsString, IsBoolean, IsNumber, IsObject, IsOptional, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateFormFieldDto {
  @IsString() @IsOptional() label?: string;
  @IsString() @IsOptional() placeholder?: string;
  @IsBoolean() @IsOptional() required?: boolean;
  @IsNumber() @IsOptional() displayOrder?: number;
  @IsObject() @IsOptional() validation?: Record<string, unknown>;
  @IsArray() @IsOptional() options?: unknown[];
  @ApiPropertyOptional() @IsOptional() @IsString() stepId?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() conditionalLogic?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsString() width?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}

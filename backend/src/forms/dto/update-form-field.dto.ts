import { IsString, IsBoolean, IsNumber, IsObject, IsOptional, IsArray } from 'class-validator';

export class UpdateFormFieldDto {
  @IsString() @IsOptional() label?: string;
  @IsString() @IsOptional() placeholder?: string;
  @IsBoolean() @IsOptional() required?: boolean;
  @IsNumber() @IsOptional() displayOrder?: number;
  @IsObject() @IsOptional() validation?: Record<string, unknown>;
  @IsArray() @IsOptional() options?: unknown[];
}

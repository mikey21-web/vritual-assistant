import { IsString, IsBoolean, IsOptional, IsIn, IsNumber, IsArray } from 'class-validator';

export class CreateCustomFieldDto {
  @IsString() name: string;
  @IsString() key: string;
  @IsIn(['TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'DROPDOWN']) type: string;
  @IsIn(['CONTACT', 'LEAD']) target: string;
  @IsArray() @IsOptional() options?: unknown[];
  @IsBoolean() @IsOptional() required?: boolean;
  @IsBoolean() @IsOptional() active?: boolean;
  @IsNumber() @IsOptional() displayOrder?: number;
}

export class UpdateCustomFieldDto {
  @IsString() @IsOptional() name?: string;
  @IsBoolean() @IsOptional() required?: boolean;
  @IsBoolean() @IsOptional() active?: boolean;
  @IsNumber() @IsOptional() displayOrder?: number;
  @IsArray() @IsOptional() options?: unknown[];
}

import { IsString, IsBoolean, IsOptional, IsIn, IsNumber, IsArray } from 'class-validator';

export class CreateCustomFieldDto {
  @IsString() name: string;
  @IsString() key: string;
  @IsIn(['TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'DROPDOWN', 'MULTI_SELECT']) type: string;
  @IsIn(['CONTACT', 'LEAD', 'TICKET', 'TEAM_MEMBER']) target: string;
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

export class ReorderCustomFieldsDto {
  @IsArray() @IsString({ each: true }) ids: string[];
}

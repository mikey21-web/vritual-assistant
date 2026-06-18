import { IsString, IsBoolean, IsObject, IsOptional } from 'class-validator';

export class UpdateBookingSettingDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() provider?: string;
  @IsObject() @IsOptional() config?: Record<string, unknown>;
  @IsBoolean() @IsOptional() active?: boolean;
}

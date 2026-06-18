import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class UpdateQrCodeDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() destination?: string;
  @IsBoolean() @IsOptional() active?: boolean;
}

export class RecordQrScanDto {
  @IsString() @IsOptional() country?: string;
  @IsString() @IsOptional() city?: string;
  @IsString() @IsOptional() userAgent?: string;
}

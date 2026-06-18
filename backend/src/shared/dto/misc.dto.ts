import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCrmMappingDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() crmType: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() fieldMappings?: Record<string, unknown>;
}

export class CreateBookingSettingDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() provider: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() config?: Record<string, unknown>;
}

export class CreateQrCodeDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() destinationType: string;
  @ApiProperty() @IsString() destination: string;
}

export class CreateUserDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() email: string;
  @ApiPropertyOptional() @IsOptional() @IsString() password?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() role?: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() password?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
}

export class CreateContactDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() company?: string;
}

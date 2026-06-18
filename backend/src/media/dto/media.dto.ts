import { IsString, IsOptional, IsNumber, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMediaDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() fileName?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() category?: string;
  @ApiProperty({ required: false }) @IsOptional() tags?: string[];
  @ApiProperty({ required: false }) @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class AttachMediaDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() leadId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() campaignId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() templateId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() contactId?: string;
}

export class MediaQueryDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() category?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() search?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() skip?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() take?: number;
}

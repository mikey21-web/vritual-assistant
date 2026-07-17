import { IsString, IsOptional, IsNumber, IsObject, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMediaDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() fileName?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() category?: string;
  @ApiProperty({ required: false }) @IsOptional() tags?: string[];
  @ApiProperty({ required: false }) @IsOptional() @IsObject() metadata?: Record<string, unknown>;
  @ApiProperty({ required: false }) @IsOptional() @IsString() projectId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() propertyId?: string;
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
  @ApiProperty({ required: false }) @IsOptional() @IsString() projectId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() propertyId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() collectionId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() fileType?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() page?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() limit?: string;
}

export class CreateCollectionDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() description?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() projectId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() propertyId?: string;
}

export class UpdateCollectionDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() name?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() description?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() coverImageUrl?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() projectId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() propertyId?: string;
}
import { IsString, IsOptional, IsIn, IsArray, IsNumber, IsInt, IsDateString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() location?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reraId?: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(['PLANNING', 'UNDER_CONSTRUCTION', 'READY_TO_MOVE', 'COMPLETED']) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() possessionDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) amenities?: string[];
}

export class UpdateProjectDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() location?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reraId?: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(['PLANNING', 'UNDER_CONSTRUCTION', 'READY_TO_MOVE', 'COMPLETED']) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() possessionDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) amenities?: string[];
}

export class CreateTowerDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() totalFloors?: number;
}

export class CreateUnitDto {
  @ApiPropertyOptional() @IsOptional() @IsString() towerId?: string;
  @ApiProperty() @IsString() unitNumber: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() floor?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() unitType?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() areaSqft?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() price?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() facing?: string;
}

export class BulkUnitRowDto {
  @ApiPropertyOptional() @IsOptional() @IsString() towerName?: string;
  @ApiProperty() @IsString() unitNumber: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() floor?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() unitType?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() areaSqft?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() price?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() facing?: string;
}

export class BulkImportUnitsDto {
  @ApiProperty({ type: [BulkUnitRowDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkUnitRowDto)
  units: BulkUnitRowDto[];
}

export class UpdateUnitDto {
  @ApiPropertyOptional() @IsOptional() @IsString() unitNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() floor?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() unitType?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() areaSqft?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() price?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() facing?: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(['AVAILABLE', 'BLOCKED', 'BOOKED', 'SOLD', 'ON_HOLD']) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() leadId?: string | null;
}

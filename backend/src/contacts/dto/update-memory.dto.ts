import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

class MemoryFactDto {
  @ApiPropertyOptional() @IsString() key: string;
  @ApiPropertyOptional() @IsString() value: string;
}

export class UpdateMemoryDto {
  @ApiPropertyOptional({ type: [MemoryFactDto], description: 'Structured facts learned about the contact, upserted by key' })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => MemoryFactDto)
  facts?: MemoryFactDto[];

  @ApiPropertyOptional({ description: 'A free-form note worth remembering across future conversations' })
  @IsOptional() @IsString()
  note?: string;
}

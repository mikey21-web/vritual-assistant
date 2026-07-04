import { IsArray, IsString, IsOptional, IsNumber, Min, IsIn, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class QuoteItemDto {
  @ApiProperty({ description: 'Item name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Quantity', minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: 'Unit price (optional for RFQ)' })
  @IsOptional()
  @IsNumber()
  price?: number;
}

export class CreateQuoteRequestDto {
  @ApiProperty({ description: 'Lead ID to associate with this quote request' })
  @IsString()
  leadId: string;

  @ApiProperty({ type: [QuoteItemDto], description: 'Line items requested' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuoteItemDto)
  items: QuoteItemDto[];

  @ApiPropertyOptional({ description: 'Additional notes for the quote' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class SendQuoteDto {
  @ApiProperty({ enum: ['WHATSAPP', 'EMAIL'], description: 'Channel to send the quote on' })
  @IsIn(['WHATSAPP', 'EMAIL'])
  channel: 'WHATSAPP' | 'EMAIL';
}

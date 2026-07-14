import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';

export class QuoteDto {
  @IsString()
  origin: string;

  @IsString()
  destination: string;

  @IsNumber()
  weight: number;

  @IsOptional()
  @IsEnum(['FTL', 'LTL', 'AIR_FREIGHT', 'SEA_FREIGHT', 'EXPRESS', 'COURIER'])
  shipmentType?: string;

  @IsOptional()
  @IsString()
  cargoType?: string;
}

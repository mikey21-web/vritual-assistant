import { IsString, IsOptional, IsNumber, IsEnum, IsDateString } from 'class-validator';

export class CreateShipmentDto {
  @IsString()
  leadId: string;

  @IsString()
  origin: string;

  @IsString()
  destination: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsEnum(['FTL', 'LTL', 'AIR_FREIGHT', 'SEA_FREIGHT', 'EXPRESS', 'COURIER'])
  shipmentType?: string;

  @IsOptional()
  @IsNumber()
  weight?: number;

  @IsOptional()
  @IsDateString()
  pickupDate?: string;

  @IsOptional()
  @IsDateString()
  scheduledPickupAt?: string;

  @IsOptional()
  @IsDateString()
  scheduledDeliveryAt?: string;

  @IsOptional()
  @IsString()
  cargoType?: string;

  @IsOptional()
  @IsNumber()
  quotedPrice?: number;

  @IsOptional()
  @IsString()
  carrierName?: string;

  @IsOptional()
  @IsString()
  vehicleType?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

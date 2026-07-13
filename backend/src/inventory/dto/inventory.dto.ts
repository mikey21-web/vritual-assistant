import { IsString, IsOptional, IsIn, IsNumber, IsBoolean } from 'class-validator';

export class CreateInventoryItemDto {
  @IsString() name!: string;
  @IsString() @IsOptional() category?: string;
  @IsString() @IsOptional() sku?: string;
  @IsString() @IsOptional() size?: string;
  @IsNumber() @IsOptional() quantity?: number;
  @IsNumber() @IsOptional() minStock?: number;
  @IsString() @IsOptional() unit?: string;
  @IsString() @IsOptional() locationId?: string;
  @IsString() @IsOptional() barcode?: string;
  @IsString() @IsOptional() supplierInfo?: string;
}

export class CreateStockMovementDto {
  @IsString() itemId!: string;
  @IsIn(['RECEIVED', 'SHIPPED', 'TRANSFER', 'ADJUSTMENT']) type!: string;
  @IsNumber() qty!: number;
  @IsString() @IsOptional() fromLocationId?: string;
  @IsString() @IsOptional() toLocationId?: string;
  @IsString() @IsOptional() refNotes?: string;
}

export class CreateLocationDto {
  @IsString() name!: string;
  @IsString() @IsOptional() type?: string;
  @IsString() @IsOptional() description?: string;
  @IsBoolean() @IsOptional() active?: boolean;
  @IsString() @IsOptional() parentLocationId?: string;
}

export class AllocateInventoryDto {
  @IsString() itemId!: string;
  @IsNumber() qtyAllocated!: number;
}

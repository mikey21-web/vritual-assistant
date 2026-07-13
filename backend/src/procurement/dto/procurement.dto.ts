import { IsString, IsOptional, IsIn, IsNumber, IsDateString, IsArray } from 'class-validator';

export class CreatePartnerDto {
  @IsString() name!: string;
  @IsIn(['VENDOR', 'SUPPLIER', 'BOTH']) @IsOptional() type?: string;
  @IsString() @IsOptional() company?: string;
  @IsString() @IsOptional() email?: string;
  @IsString() @IsOptional() phone?: string;
  @IsString() @IsOptional() gstin?: string;
  @IsString() @IsOptional() location?: string;
  @IsString() @IsOptional() address?: string;
  @IsString() @IsOptional() category?: string;
  @IsString() @IsOptional() specialty?: string;
  @IsString() @IsOptional() notes?: string;
}

export class CreateVendorBookingDto {
  @IsString() partnerId!: string;
  @IsString() eventId!: string;
  @IsString() title!: string;
  @IsDateString() @IsOptional() eventDate?: string;
  @IsString() @IsOptional() venue?: string;
  @IsArray() @IsOptional() deliverables?: string[];
  @IsString() @IsOptional() specialRequirements?: string;
  @IsNumber() @IsOptional() agreedFee?: number;
  @IsNumber() @IsOptional() advanceAmount?: number;
  @IsString() @IsOptional() cancellationTerms?: string;
  @IsString() @IsOptional() internalNotes?: string;
}

export class UpdateVendorBookingDto {
  @IsIn(['DRAFT', 'SENT', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']) @IsOptional() status?: string;
}

class POLineItemDto {
  @IsString() description!: string;
  @IsNumber() @IsOptional() qty?: number;
  @IsNumber() unitCost!: number;
}

export class CreatePurchaseOrderDto {
  @IsString() partnerId!: string;
  @IsString() @IsOptional() eventId?: string;
  @IsDateString() @IsOptional() expectedDelivery?: string;
  @IsString() @IsOptional() notes?: string;
  @IsArray() @IsOptional() lineItems?: POLineItemDto[];
}

export class UpdatePurchaseOrderDto {
  @IsIn(['DRAFT', 'SUBMITTED', 'PARTIAL', 'RECEIVED', 'CANCELLED']) @IsOptional() status?: string;
}

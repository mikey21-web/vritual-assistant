import { IsString, IsOptional, IsArray, ValidateNested, IsInt, IsBoolean, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class CostSheetLineItemDto {
  @IsString()
  code: string;

  @IsString()
  label: string;

  @IsOptional()
  @IsIn(['FLAT', 'PER_SQFT', 'PERCENT'])
  calculationType?: string;

  @IsInt()
  amountPaise: number;

  @IsOptional()
  @IsBoolean()
  taxable?: boolean;

  @IsOptional()
  @IsInt()
  displayOrder?: number;
}

export class CreateCostSheetDto {
  @IsString()
  leadId: string;

  @IsString()
  unitId: string;

  @IsString()
  projectId: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CostSheetLineItemDto)
  lineItems?: CostSheetLineItemDto[];
}

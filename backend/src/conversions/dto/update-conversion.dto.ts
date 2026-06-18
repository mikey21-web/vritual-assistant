import { IsString, IsOptional, IsIn } from 'class-validator';

export class UpdateConversionDto {
  @IsString() @IsOptional() @IsIn(['REQUESTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED'])
  status?: string;
  @IsString() @IsOptional() externalId?: string;
}

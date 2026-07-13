import { IsString, IsOptional, IsIn, IsDateString, IsNumber, IsInt } from 'class-validator';

export class CreateEventDto {
  @IsString() title!: string;
  @IsString() type!: string;
  @IsIn(['PLANNING', 'UPCOMING', 'COMPLETED', 'CANCELLED']) @IsOptional() status?: string;
  @IsDateString() @IsOptional() eventDate?: string;
  @IsString() @IsOptional() venue?: string;
  @IsInt() @IsOptional() expectedGuests?: number;
  @IsNumber() @IsOptional() budget?: number;
  @IsString() @IsOptional() description?: string;
  @IsString() @IsOptional() contactId?: string;
  @IsString() @IsOptional() leadId?: string;
}

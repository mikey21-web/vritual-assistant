import { IsString, IsEmail, IsOptional, IsArray } from 'class-validator';

export class UpdateContactDto {
  @IsString() @IsOptional() name?: string;
  @IsEmail() @IsOptional() email?: string;
  @IsString() @IsOptional() phone?: string;
  @IsString() @IsOptional() whatsapp?: string;
  @IsString() @IsOptional() company?: string;
  @IsString() @IsOptional() location?: string;
  @IsString() @IsOptional() preferredChannel?: string;
  @IsArray() @IsOptional() tags?: string[];
}

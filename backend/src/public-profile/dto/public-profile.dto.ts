import { IsString, IsOptional, IsInt, IsBoolean, IsArray, Matches } from 'class-validator';

export class UpdatePublicProfileDto {
  @IsString() @IsOptional() companyName?: string;
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug must be lowercase letters, numbers, and hyphens only' }) @IsOptional() slug?: string;
  @IsString() @IsOptional() tagline?: string;
  @IsString() @IsOptional() city?: string;
  @IsString() @IsOptional() address?: string;
  @IsInt() @IsOptional() yearsExperience?: number;
  @IsInt() @IsOptional() eventsExecuted?: number;
  @IsString() @IsOptional() about?: string;
  @IsString() @IsOptional() phone?: string;
  @IsString() @IsOptional() whatsapp?: string;
  @IsString() @IsOptional() email?: string;
  @IsString() @IsOptional() website?: string;
  @IsString() @IsOptional() instagramUrl?: string;
  @IsString() @IsOptional() youtubeUrl?: string;
  @IsString() @IsOptional() facebookUrl?: string;
  @IsString() @IsOptional() googleMapsUrl?: string;
  @IsArray() @IsOptional() servicesOffered?: string[];
  @IsString() @IsOptional() coverImageUrl?: string;
  @IsBoolean() @IsOptional() published?: boolean;
}

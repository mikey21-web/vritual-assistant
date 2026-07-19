import { IsString, IsEmail, IsOptional, MinLength } from 'class-validator';

export class PartnerLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class CreatePartnerPortalUserDto {
  @IsString()
  channelPartnerId: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

export class RegisterPartnerLeadDto {
  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  leadId?: string;
}

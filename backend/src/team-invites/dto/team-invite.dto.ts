import { IsString, IsEmail, IsOptional, IsObject, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTeamInviteDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsEmail() email: string;
  @ApiPropertyOptional() @IsOptional() @IsString() role?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() department?: string;
  @ApiPropertyOptional({ description: 'Map of PermissionModule -> PermissionLevel, e.g. { CRM: "FULL_ACCESS" }' })
  @IsOptional() @IsObject() moduleGrants?: Record<string, string>;
}

export class AcceptTeamInviteDto {
  @ApiProperty() @IsString() token: string;
  @ApiProperty() @IsString() @MinLength(10) password: string;
}

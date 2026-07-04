import { IsString, IsOptional, IsEmail, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterMemberDto {
  @ApiProperty({ description: 'Lead ID to associate with this registration' })
  @IsString()
  leadId: string;

  @ApiProperty({ description: 'Member email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Member full name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Member phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Registration preferences (e.g. interests, topics)' })
  @IsOptional()
  @IsObject()
  preferences?: Record<string, unknown>;
}

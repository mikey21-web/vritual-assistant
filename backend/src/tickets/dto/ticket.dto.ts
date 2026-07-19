import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_ON_CUSTOMER = 'WAITING_ON_CUSTOMER',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

/** spec 68.2 required categories */
export enum TicketCategory {
  PAYMENT_ACCOUNT = 'PAYMENT_ACCOUNT',
  DOCUMENT_AGREEMENT = 'DOCUMENT_AGREEMENT',
  LOAN_REGISTRATION = 'LOAN_REGISTRATION',
  CONSTRUCTION_UPDATE = 'CONSTRUCTION_UPDATE',
  POSSESSION = 'POSSESSION',
  DEFECT_SERVICE = 'DEFECT_SERVICE',
  COMMUNICATION = 'COMMUNICATION',
  CANCELLATION_TRANSFER = 'CANCELLATION_TRANSFER',
  OTHER = 'OTHER',
}

export class CreateTicketDto {
  @ApiProperty() @IsString() subject: string;
  @ApiProperty() @IsString() description: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(TicketCategory) category?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(TicketPriority) priority?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() leadId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contactId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() assignedAgentId?: string;
}

export class UpdateTicketDto {
  @ApiPropertyOptional() @IsOptional() @IsEnum(TicketStatus) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(TicketPriority) priority?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() subject?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() assignedAgentId?: string;
}

export class CreateCommentDto {
  @ApiProperty() @IsString() content: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isInternal?: boolean;
}

export class KnowledgeArticleDto {
  @ApiProperty() @IsString() title: string;
  @ApiProperty() @IsString() slug: string;
  @ApiProperty() @IsString() body: string;
  @ApiPropertyOptional() @IsOptional() tags?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() published?: boolean;
}

export class UpdateKnowledgeArticleDto {
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() slug?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() body?: string;
  @ApiPropertyOptional() @IsOptional() tags?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() published?: boolean;
}

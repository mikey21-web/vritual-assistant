import { IsString, IsOptional, IsArray, IsIn } from 'class-validator';

export class CreateDocumentTemplateDto {
  @IsString()
  name: string;

  @IsString()
  documentType: string;

  @IsString()
  bodyTemplate: string;

  @IsOptional()
  @IsArray()
  variables?: string[];
}

export class GenerateDocumentDto {
  @IsString()
  templateId: string;

  @IsString()
  leadId: string;

  @IsOptional()
  @IsString()
  bookingId?: string;

  @IsOptional()
  variables?: Record<string, string>;
}

export class GenerateDemandLetterDto {
  @IsString()
  paymentScheduleId: string;
}

import { IsString, IsOptional, IsIn } from 'class-validator';

const DOCUMENT_TYPES = [
  'PAN', 'AADHAAR_OFFLINE_XML', 'ADDRESS_PROOF', 'PHOTO', 'SALARY_PROOF',
  'BANK_STATEMENT', 'LOAN_SANCTION_LETTER', 'BOOKING_FORM', 'ALLOTMENT_LETTER',
  'AGREEMENT_DRAFT', 'SIGNED_AGREEMENT', 'NOC', 'POSSESSION_LETTER', 'OTHER',
];

export class RequestBuyerDocumentDto {
  @IsString()
  leadId: string;

  @IsOptional()
  @IsString()
  bookingId?: string;

  @IsIn(DOCUMENT_TYPES)
  type: string;
}

export class UploadBuyerDocumentDto {
  @IsString()
  mediaFileId: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  documentNumberMasked?: string;
}

export class RejectBuyerDocumentDto {
  @IsString()
  reason: string;
}

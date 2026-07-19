import { IsString, IsOptional } from 'class-validator';

export class CreateESignRequestDto {
  @IsString()
  generatedDocumentId: string;

  @IsOptional()
  @IsString()
  signerName?: string;

  @IsOptional()
  @IsString()
  signerEmail?: string;

  @IsOptional()
  @IsString()
  signerPhone?: string;

  @IsOptional()
  @IsString()
  provider?: string;
}

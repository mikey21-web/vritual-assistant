import { IsString } from 'class-validator';

export class EnrollLeadDto {
  @IsString()
  leadId: string;
}

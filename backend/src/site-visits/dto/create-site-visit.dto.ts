import { IsString, IsOptional, IsDateString, IsInt, Min } from 'class-validator';

export class CreateSiteVisitDto {
  @IsString()
  leadId: string;

  @IsString()
  projectId: string;

  @IsOptional()
  @IsString()
  unitId?: string;

  @IsOptional()
  @IsString()
  assignedAgentId?: string;

  @IsDateString()
  startAt: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsString()
  meetingPoint?: string;

  @IsOptional()
  @IsString()
  mapsUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  attendeeCount?: number;

  @IsOptional()
  @IsString()
  transportNote?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  confirmationChannel?: string;
}

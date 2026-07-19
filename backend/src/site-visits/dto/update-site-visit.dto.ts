import { IsString, IsOptional, IsDateString, IsInt, Min } from 'class-validator';

export class UpdateSiteVisitDto {
  @IsOptional()
  @IsString()
  unitId?: string;

  @IsOptional()
  @IsString()
  assignedAgentId?: string;

  @IsOptional()
  @IsDateString()
  startAt?: string;

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
}

export class RescheduleSiteVisitDto {
  @IsDateString()
  startAt: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class CompleteSiteVisitOutcomeDto {
  @IsOptional()
  outcome?: Record<string, unknown>;

  @IsOptional()
  @IsDateString()
  nextActionAt?: string;
}

export class NoShowSiteVisitDto {
  @IsOptional()
  @IsString()
  noShowReason?: string;
}

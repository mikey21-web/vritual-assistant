import { IsString, IsOptional, IsIn, IsInt, IsArray, ValidateNested, IsISO8601, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GeneratePairingCodeDto {
  @ApiPropertyOptional() @IsString() @IsOptional() name?: string;
}

export class PairDeviceDto {
  @ApiProperty() @IsString() pairingCode: string;
  @ApiPropertyOptional() @IsString() @IsOptional() model?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() platform?: string;
}

export class CallSyncEntryDto {
  @ApiPropertyOptional() @IsString() @IsOptional() localId?: string;
  @ApiProperty() @IsString() fromNumber: string;
  @ApiProperty() @IsString() toNumber: string;
  @ApiProperty() @IsIn(['INBOUND', 'OUTBOUND']) direction: 'INBOUND' | 'OUTBOUND';
  @ApiProperty() @IsIn(['SIM', 'WHATSAPP']) source: 'SIM' | 'WHATSAPP';
  @ApiProperty() @IsISO8601() startedAt: string;
  @ApiPropertyOptional() @IsInt() @Min(0) @IsOptional() durationSec?: number;
  @ApiPropertyOptional() @IsIn(['COMPLETED', 'NO_ANSWER', 'BUSY', 'FAILED', 'MISSED']) @IsOptional() status?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() recordingUrl?: string;
}

export class CallSyncDto {
  @ApiProperty({ type: [CallSyncEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CallSyncEntryDto)
  calls: CallSyncEntryDto[];
}

export class AnalyticsQueryDto {
  @ApiPropertyOptional({ enum: ['7d', '30d', '90d'], default: '7d' })
  @IsOptional()
  @IsIn(['7d', '30d', '90d'])
  range?: '7d' | '30d' | '90d' = '7d';
}

export class SyncLogsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: ['SUCCESS', 'FAILED'] })
  @IsOptional()
  @IsIn(['SUCCESS', 'FAILED'])
  status?: string;
}

export class UpdateNotesDto {
  @ApiProperty()
  @IsString()
  notes: string;
}

export class UpdateDispositionDto {
  @ApiProperty()
  @IsString()
  disposition: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nextActionAt?: string;
}

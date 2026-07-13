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
  @ApiPropertyOptional() @IsIn(['COMPLETED', 'NO_ANSWER', 'BUSY', 'FAILED']) @IsOptional() status?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() recordingUrl?: string;
}

export class CallSyncDto {
  @ApiProperty({ type: [CallSyncEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CallSyncEntryDto)
  calls: CallSyncEntryDto[];
}

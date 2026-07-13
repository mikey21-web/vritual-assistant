import { IsString, IsIn } from 'class-validator';
import { PERMISSION_MODULES } from '../presets';

export class SetPermissionDto {
  @IsIn(PERMISSION_MODULES) module!: string;
  @IsIn(['NO_ACCESS', 'VIEW_ONLY', 'EDIT', 'FULL_ACCESS']) level!: string;
}

export class ApplyPresetDto {
  @IsString() preset!: string;
}

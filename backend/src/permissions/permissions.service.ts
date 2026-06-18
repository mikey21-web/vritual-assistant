import { Injectable } from '@nestjs/common';
import { PERMISSION_MATRIX } from './permissions.matrix';

@Injectable()
export class PermissionsService {
  canDo(role: string, permission: string): boolean {
    const allowed = PERMISSION_MATRIX[permission];
    if (!allowed) return false;
    return allowed.includes(role);
  }
}

import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { runInTenantContext } from '../shared/tenant-context.service';

const PLATFORM_ADMIN_ROLES = new Set(['OWNER', 'ADMIN']);

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const tenantId = req.user?.tenantId ?? null;
    const isPlatformAdmin = req.user?.role ? PLATFORM_ADMIN_ROLES.has(req.user.role) : false;
    return new Observable((subscriber) => {
      runInTenantContext(tenantId, isPlatformAdmin, () => {
        next.handle().subscribe({
          next: (val) => subscriber.next(val),
          error: (err) => subscriber.error(err),
          complete: () => subscriber.complete(),
        });
      });
    });
  }
}

import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url } = req;
    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse();
          const elapsed = Date.now() - now;
          const userId = req.user?.sub || 'anonymous';
          this.logger.log(`${method} ${res.statusCode} ${url} ${elapsed}ms user=${userId}`);
        },
        error: (err: any) => {
          const elapsed = Date.now() - now;
          const userId = req.user?.sub || 'anonymous';
          const status = err?.status || err?.statusCode || 500;
          this.logger.error(`${method} ${status} ${url} ${elapsed}ms user=${userId} error=${err?.message || 'unknown'}`);
        },
      }),
    );
  }
}

import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

const PII_PATTERNS = [
  { regex: /"email"\s*:\s*"[^"]+"/g, replacement: '"email":"[REDACTED]"' },
  { regex: /"phone"\s*:\s*"[^"]+"/g, replacement: '"phone":"[REDACTED]"' },
  { regex: /"whatsapp"\s*:\s*"[^"]+"/g, replacement: '"whatsapp":"[REDACTED]"' },
  { regex: /"password"\s*:\s*"[^"]+"/g, replacement: '"password":"[REDACTED]"' },
  { regex: /"token"\s*:\s*"[^"]+"/g, replacement: '"token":"[REDACTED]"' },
  { regex: /"accessToken"\s*:\s*"[^"]+"/g, replacement: '"accessToken":"[REDACTED]"' },
  { regex: /"refreshToken"\s*:\s*"[^"]+"/g, replacement: '"refreshToken":"[REDACTED]"' },
  { regex: /"text"\s*:\s*"[^"]+"/g, replacement: '"text":"[REDACTED]"' },
];

function redactPii(body: string): string {
  let result = body;
  for (const { regex, replacement } of PII_PATTERNS) {
    result = result.replace(regex, replacement);
  }
  return result;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url } = req;
    const now = Date.now();

    // Log request body with PII redaction for non-GET requests
    if (method !== 'GET' && req.body && Object.keys(req.body).length > 0) {
      try {
        const bodyStr = JSON.stringify(req.body);
        const redacted = redactPii(bodyStr);
        if (redacted.length < 500) {
          this.logger.debug(`${method} ${url} body=${redacted}`);
        }
      } catch {}
    }

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

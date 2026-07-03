import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { IS_PUBLIC_KEY } from './public.decorator';

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Always compare equal-length buffers to prevent timing leak
    const dummy = Buffer.alloc(bufA.length);
    crypto.timingSafeEqual(bufA, dummy);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector, private config: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const serviceKey = request.headers['x-service-key'];

    if (serviceKey) {
      const configuredKey = this.config.get<string>('AGENT_SERVICE_JWT');
      if (!configuredKey) throw new UnauthorizedException('Service key auth not configured');
      if (!timingSafeEqual(serviceKey, configuredKey)) throw new UnauthorizedException('Invalid service key');

      // Agent service is internal (Docker network), trusted via shared secret.
      // No path restriction needed.  The AGENT_SERVICE_JWT is a strong secret.

      // In single-tenant mode, the tenant is implicit. Set user context for the agent.
      request.user = {
        sub: 'agent-service',
        email: 'agent@service.internal',
        role: 'SALES_AGENT',
      };
      return true;
    }

    return super.canActivate(context);
  }
}

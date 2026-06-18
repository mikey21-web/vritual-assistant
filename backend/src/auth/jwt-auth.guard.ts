import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from './public.decorator';

const AGENT_ENDPOINTS = ['/agent/'];

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
      if (serviceKey !== configuredKey) throw new UnauthorizedException('Invalid service key');

      const url = request.url || '';
      if (!AGENT_ENDPOINTS.some(prefix => url.startsWith(prefix))) {
        throw new UnauthorizedException('Service key only permitted on agent endpoints');
      }

      const tenantIdHeader = request.headers['x-tenant-id'] as string;
      if (!tenantIdHeader) throw new UnauthorizedException('x-tenant-id header required with service key');

      request.user = {
        sub: 'agent-service',
        email: 'agent@service.internal',
        role: 'SALES_AGENT',
        tenantId: tenantIdHeader,
      };
      return true;
    }

    return super.canActivate(context);
  }
}

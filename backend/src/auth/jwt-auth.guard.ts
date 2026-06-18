import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from './public.decorator';

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
    if (serviceKey && serviceKey === this.config.get<string>('AGENT_SERVICE_JWT')) {
      request.user = {
        sub: 'agent-service',
        email: 'agent@service.internal',
        role: 'SALES_AGENT',
        tenantId: request.body?.tenantId || request.query?.tenantId || null,
      };
      return true;
    }

    return super.canActivate(context);
  }
}

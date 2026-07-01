import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Extracts tenant context from JWT (embedded tenantId) or header (x-tenant-slug).
 * Attaches to req.tenantId for use by all downstream services.
 */
@Injectable()
export class TenantResolverMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantResolverMiddleware.name);

  use(req: Request, _res: Response, next: NextFunction) {
    // 1. From JWT (set by JwtStrategy after auth)
    if (req.user && (req.user as any).tenantId) {
      (req as any).tenantId = (req.user as any).tenantId;
      return next();
    }

    // 2. From header (service-to-service calls)
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (tenantSlug) {
      (req as any).tenantSlug = tenantSlug;
    }

    // 3. Public endpoints may not have tenant context
    next();
  }
}

/**
 * Prisma middleware that filters all queries by tenantId.
 */
export function tenantPrismaMiddleware(params: any, next: any) {
  const model = params.model;
  const tenantModels = ['User', 'Contact', 'Lead', 'Campaign', 'Integration'];

  if (tenantModels.includes(model) && ['findMany', 'findFirst', 'findUnique', 'count', 'update', 'updateMany', 'delete', 'deleteMany', 'aggregate'].includes(params.action)) {
    const args = params.args || {};
    const tenantId = args.tenantId || global.__tenantId;
    if (tenantId && !args.where?.tenantId) {
      args.where = { ...args.where, tenantId };
    }
  }
  return next(params);
}

// Global storage for current request's tenantId (set by middleware)
declare global {
  var __tenantId: string | undefined;
}

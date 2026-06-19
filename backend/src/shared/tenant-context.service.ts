import { Injectable } from '@nestjs/common';

/**
 * Simplified tenant context for single-tenant architecture.
 *
 * In a single-tenant-per-deploy model, there is exactly one tenant.
 * The tenant ID is resolved from the niche config at boot.
 * These helpers still work for backward compatibility with existing services
 * that reference tenantId.
 */

export interface TenantUser {
  sub?: string;
  tenantId?: string | null;
  role?: string;
}

export interface TenantContext {
  tenantId: string | null;
  isPlatformAdmin: boolean;
}

/**
 * Returns a tenant filter for Prisma queries.
 * In single-tenant mode, returns {} (no filter) since all data belongs to one tenant.
 */
export function tenantFilter(user?: TenantUser | null): { tenantId?: string } {
  return {};
}

/**
 * Returns the current tenant context.
 * In single-tenant mode, returns a default context since multi-tenant isolation is not needed.
 */
export function getTenantContext(): TenantContext {
  return { tenantId: null, isPlatformAdmin: true };
}

/**
 * Returns the current tenant ID.
 * In single-tenant mode, returns null (no scoping needed).
 * Services that need a specific tenant ID should resolve it from the config/business settings.
 */
export function getCurrentTenantId(): string | null {
  return null;
}

/**
 * Runs a function in a tenant context.
 * In single-tenant mode, this just runs the function directly.
 */
export function runInTenantContext<T>(
  _tenantId: string | null,
  _isPlatformAdmin: boolean,
  fn: () => T,
): T {
  return fn();
}

@Injectable()
export class TenantContextService {
  getFilter(user?: TenantUser | null): { tenantId?: string } {
    return tenantFilter(user);
  }
}

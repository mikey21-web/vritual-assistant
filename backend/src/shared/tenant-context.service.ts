import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

export interface TenantUser {
  sub?: string;
  tenantId?: string | null;
  role?: string;
}

export interface TenantContext {
  tenantId: string | null;
  isPlatformAdmin: boolean;
}

const tenantStorage = new AsyncLocalStorage<TenantContext>();

const PLATFORM_ADMIN_ROLES = new Set(['OWNER', 'ADMIN']);

export function getTenantContext(): TenantContext {
  const store = tenantStorage.getStore();
  return store ?? { tenantId: null, isPlatformAdmin: false };
}

export function getCurrentTenantId(): string | null {
  return tenantStorage.getStore()?.tenantId ?? null;
}

export function runInTenantContext<T>(
  tenantId: string | null,
  isPlatformAdmin: boolean,
  fn: () => T,
): T {
  return tenantStorage.run({ tenantId, isPlatformAdmin }, fn);
}

export function tenantFilter(user?: TenantUser | null): { tenantId?: string } {
  const tenantId = user?.tenantId || null;
  const role = user?.role;
  const isPlatformAdmin = role ? PLATFORM_ADMIN_ROLES.has(role) : false;

  if (!tenantId) {
    if (!isPlatformAdmin) return { tenantId: '__no_tenant__' };
    return {};
  }
  return { tenantId };
}

@Injectable()
export class TenantContextService {
  getFilter(user?: TenantUser | null): { tenantId?: string } {
    return tenantFilter(user);
  }
}

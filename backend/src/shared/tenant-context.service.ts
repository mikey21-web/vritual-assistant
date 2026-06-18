import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

export interface TenantUser {
  sub?: string;
  tenantId?: string | null;
  role?: string;
}

const tenantStorage = new AsyncLocalStorage<{ tenantId: string | null }>();

export function getCurrentTenantId(): string | null {
  const store = tenantStorage.getStore();
  return store?.tenantId ?? null;
}

export function runInTenantContext<T>(tenantId: string | null, fn: () => T): T {
  return tenantStorage.run({ tenantId }, fn);
}

export function tenantFilter(user?: TenantUser | null): { tenantId?: string | null } {
  const tenantId = user?.tenantId || null;
  if (!tenantId) return {};
  return { tenantId };
}

@Injectable()
export class TenantContextService {
  getFilter(user?: TenantUser | null): { tenantId?: string | null } {
    return tenantFilter(user);
  }
}

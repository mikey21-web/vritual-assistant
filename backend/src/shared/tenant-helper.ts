/**
 * Tenant helper for single-tenant deployments transitioning to multi-tenant.
 * Uses the tenant from the current request (set by TenantResolverMiddleware),
 * or falls back to the DEFAULT_TENANT_ID env var / 'default-tenant'.
 */

export function getTenantId(req?: any): string {
  if (req?.tenantId) return req.tenantId;
  if (req?.user?.tenantId) return req.user.tenantId;
  return process.env.DEFAULT_TENANT_ID || 'default-tenant';
}

/**
 * Creates a tenant connect object for Prisma create calls.
 */
export function tenantConnect(req?: any) {
  return { tenant: { connect: { id: getTenantId(req) } } };
}

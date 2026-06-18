import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsService } from './permissions.service';

describe('PermissionsService', () => {
  let service: PermissionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PermissionsService],
    }).compile();
    service = module.get(PermissionsService);
  });

  it('OWNER can do everything in the matrix', () => {
    expect(service.canDo('OWNER', 'tenants:read')).toBe(true);
    expect(service.canDo('OWNER', 'tenants:write')).toBe(true);
    expect(service.canDo('OWNER', 'leads:read')).toBe(true);
    expect(service.canDo('OWNER', 'leads:delete')).toBe(true);
    expect(service.canDo('OWNER', 'analytics:read')).toBe(true);
    expect(service.canDo('OWNER', 'audit_logs:read')).toBe(true);
    expect(service.canDo('OWNER', 'health:deep')).toBe(true);
  });

  it('VIEWER cannot write leads', () => {
    expect(service.canDo('VIEWER', 'leads:read')).toBe(true);
    expect(service.canDo('VIEWER', 'leads:write')).toBe(false);
  });

  it('SALES_AGENT can read leads', () => {
    expect(service.canDo('SALES_AGENT', 'leads:read')).toBe(true);
  });

  it('SALES_AGENT cannot access audit_logs', () => {
    expect(service.canDo('SALES_AGENT', 'audit_logs:read')).toBe(false);
  });

  it('MANAGER can retry failures', () => {
    expect(service.canDo('MANAGER', 'failures:read')).toBe(true);
    expect(service.canDo('MANAGER', 'failures:retry')).toBe(true);
  });

  it('SUPPORT_AGENT cannot delete leads', () => {
    expect(service.canDo('SUPPORT_AGENT', 'leads:delete')).toBe(false);
  });

  it('unknown permission returns false for any role', () => {
    expect(service.canDo('OWNER', 'nonexistent:permission')).toBe(false);
  });

  it('unknown role returns false for any permission', () => {
    expect(service.canDo('UNKNOWN_ROLE', 'leads:read')).toBe(false);
  });
});

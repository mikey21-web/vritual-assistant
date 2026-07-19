import { BadRequestException } from '@nestjs/common';
import { SalesHierarchyService } from './sales-hierarchy.service';

describe('SalesHierarchyService', () => {
  const prisma = {
    user: { findFirst: jest.fn(), update: jest.fn(), findMany: jest.fn() },
    project: { findFirst: jest.fn() },
    territoryAssignment: { upsert: jest.fn(), deleteMany: jest.fn(), findMany: jest.fn() },
  } as any;
  const service = new SalesHierarchyService(prisma);

  beforeEach(() => jest.clearAllMocks());

  it('refuses to set a user as their own manager', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'u1' });
    await expect(service.setManager('t1', 'u1', 'u1')).rejects.toThrow(BadRequestException);
  });

  it('refuses a manager assignment that would create a reporting cycle', async () => {
    // Attempting to set u3 as u1's manager, where u3 already reports (transitively) to u1.
    prisma.user.findFirst
      .mockResolvedValueOnce({ id: 'u1' }) // target user exists
      .mockResolvedValueOnce({ id: 'u3' }) // candidate manager exists
      .mockResolvedValueOnce({ managerId: 'u1' }); // isDescendantOf: u3's manager chain hits u1 -> cycle

    await expect(service.setManager('t1', 'u1', 'u3')).rejects.toThrow('reporting cycle');
  });

  it('getAccessibleProjectIds returns null (unrestricted) for OWNER/ADMIN', async () => {
    expect(await service.getAccessibleProjectIds('t1', 'u1', 'OWNER')).toBeNull();
    expect(await service.getAccessibleProjectIds('t1', 'u1', 'ADMIN')).toBeNull();
  });

  it('getAccessibleProjectIds returns assigned project ids for a sales agent', async () => {
    prisma.territoryAssignment.findMany.mockResolvedValue([{ projectId: 'p1' }, { projectId: 'p2' }]);
    const ids = await service.getAccessibleProjectIds('t1', 'u1', 'SALES_AGENT');
    expect(ids).toEqual(['p1', 'p2']);
  });
});

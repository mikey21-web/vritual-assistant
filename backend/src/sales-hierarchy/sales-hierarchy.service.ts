import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Sales hierarchy (who reports to whom) + territory scoping (which projects a user can access). */
@Injectable()
export class SalesHierarchyService {
  constructor(private prisma: PrismaService) {}

  async setManager(tenantId: string, userId: string, managerId: string | null) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, tenantId } });
    if (!user) throw new NotFoundException('User not found');
    if (managerId === userId) throw new BadRequestException('A user cannot manage themself');
    if (managerId) {
      const manager = await this.prisma.user.findFirst({ where: { id: managerId, tenantId } });
      if (!manager) throw new BadRequestException('Manager not found');
      if (await this.isDescendantOf(tenantId, managerId, userId)) {
        throw new BadRequestException('This would create a reporting cycle');
      }
    }
    return this.prisma.user.update({ where: { id: userId }, data: { managerId } });
  }

  /** True if `candidateId` is already in `rootId`'s reporting chain (i.e. rootId is downstream of candidateId). */
  private async isDescendantOf(tenantId: string, candidateId: string, rootId: string): Promise<boolean> {
    let current = await this.prisma.user.findFirst({ where: { id: candidateId, tenantId }, select: { managerId: true } });
    const seen = new Set<string>();
    while (current?.managerId) {
      if (current.managerId === rootId) return true;
      if (seen.has(current.managerId)) break;
      seen.add(current.managerId);
      current = await this.prisma.user.findFirst({ where: { id: current.managerId, tenantId }, select: { managerId: true } });
    }
    return false;
  }

  /** Direct + indirect reports under a manager, as a flat list with depth. */
  async getTeamTree(tenantId: string, managerId: string) {
    const result: { id: string; name: string; role: string; depth: number }[] = [];
    const queue: { id: string; depth: number }[] = [{ id: managerId, depth: 0 }];
    while (queue.length) {
      const { id, depth } = queue.shift()!;
      const reports = await this.prisma.user.findMany({
        where: { tenantId, managerId: id },
        select: { id: true, name: true, role: true },
      });
      for (const r of reports) {
        result.push({ ...r, depth: depth + 1 });
        queue.push({ id: r.id, depth: depth + 1 });
      }
    }
    return result;
  }

  async assignTerritory(tenantId: string, userId: string, projectId: string) {
    const [user, project] = await Promise.all([
      this.prisma.user.findFirst({ where: { id: userId, tenantId } }),
      this.prisma.project.findFirst({ where: { id: projectId, tenantId } }),
    ]);
    if (!user) throw new NotFoundException('User not found');
    if (!project) throw new NotFoundException('Project not found');
    return this.prisma.territoryAssignment.upsert({
      where: { userId_projectId: { userId, projectId } },
      create: { tenantId, userId, projectId },
      update: {},
    });
  }

  async removeTerritory(tenantId: string, userId: string, projectId: string) {
    await this.prisma.territoryAssignment.deleteMany({ where: { tenantId, userId, projectId } });
    return { removed: true };
  }

  async listTerritories(tenantId: string, userId: string) {
    return this.prisma.territoryAssignment.findMany({
      where: { tenantId, userId },
      include: { project: { select: { id: true, name: true, location: true } } },
    });
  }

  /** OWNER/ADMIN see everything; anyone else is scoped to their assigned projects (empty array = no access, not "all"). */
  async getAccessibleProjectIds(tenantId: string, userId: string, role: string): Promise<string[] | null> {
    if (role === 'OWNER' || role === 'ADMIN') return null;
    const assignments = await this.prisma.territoryAssignment.findMany({
      where: { tenantId, userId },
      select: { projectId: true },
    });
    return assignments.map(a => a.projectId);
  }
}

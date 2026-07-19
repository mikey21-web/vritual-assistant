import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PartnerPortalService {
  constructor(private prisma: PrismaService) {}

  /** Only public-safe project fields — no internal cost-sheet formulas or approval notes (spec 48.12). */
  async listProjects(tenantId: string) {
    return this.prisma.project.findMany({
      where: { tenantId, deletedAt: null },
      select: { id: true, name: true, location: true, address: true, reraId: true, status: true, possessionDate: true, amenities: true, images: true, brochureUrl: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Only AVAILABLE units, and only fields a partner needs to sell — never hold/booking owner or internal notes. */
  async listAvailableUnits(tenantId: string, projectId?: string) {
    return this.prisma.unit.findMany({
      where: { tenantId, status: 'AVAILABLE', ...(projectId ? { projectId } : {}) },
      select: { id: true, projectId: true, unitNumber: true, floor: true, unitType: true, areaSqft: true, price: true, currency: true, facing: true },
      orderBy: { unitNumber: 'asc' },
    });
  }
}

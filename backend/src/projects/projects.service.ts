import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, UnitStatus } from '@prisma/client';
import { saveUploadedFile, deleteUploadedFile } from '../shared/file-storage.util';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  // ── Projects ────────────────────────────────────────────────────────────

  create(data: {
    tenantId: string;
    name: string;
    description?: string;
    location?: string;
    address?: string;
    reraId?: string;
    status?: string;
    possessionDate?: string;
    amenities?: string[];
  }) {
    return this.prisma.project.create({
      data: {
        ...data,
        possessionDate: data.possessionDate ? new Date(data.possessionDate) : undefined,
        status: (data.status as any) || 'UNDER_CONSTRUCTION',
      } as any,
    });
  }

  async findAll(query: { tenantId: string; status?: string; page?: number; limit?: number }) {
    const { tenantId, status, page = 1, limit = 20 } = query;
    const where: Prisma.ProjectWhereInput = { tenantId, deletedAt: null };
    if (status) where.status = status as any;

    const [data, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip: (+page - 1) * +limit,
        take: +limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { units: true, towers: true } } },
      }),
      this.prisma.project.count({ where }),
    ]);

    // Attach a quick sold/available summary per project without N+1-ing the caller.
    const withSummary = await Promise.all(data.map(async (p) => {
      const grouped = await this.prisma.unit.groupBy({
        by: ['status'],
        where: { projectId: p.id },
        _count: { id: true },
      });
      const summary: Record<string, number> = { AVAILABLE: 0, BLOCKED: 0, BOOKED: 0, SOLD: 0, ON_HOLD: 0 };
      for (const g of grouped) summary[g.status] = g._count.id;
      return { ...p, unitSummary: summary };
    }));

    return { data: withSummary, meta: { total, page: +page, limit: +limit } };
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        towers: { orderBy: { name: 'asc' } },
        units: { orderBy: [{ floor: 'asc' }, { unitNumber: 'asc' }] },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async update(id: string, data: any) {
    const existing = await this.prisma.project.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Project not found');
    return this.prisma.project.update({
      where: { id },
      data: { ...data, possessionDate: data.possessionDate ? new Date(data.possessionDate) : undefined },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.project.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Project not found');
    return this.prisma.project.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  // Project.images is a raw JSON array (not a relation, unlike PropertyImage)
  // since a builder project's photos are just gallery shots, not the
  // per-unit media a full relation would justify.
  async addImages(projectId: string, files: Express.Multer.File[]) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');

    const existingImages = Array.isArray(project.images) ? project.images as any[] : [];
    const newImages = files.map(file => ({ url: saveUploadedFile(file, 'project-images'), uploadedAt: new Date().toISOString() }));
    return this.prisma.project.update({
      where: { id: projectId },
      data: { images: [...existingImages, ...newImages] as any },
    });
  }

  async removeImage(projectId: string, url: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');

    const existingImages = Array.isArray(project.images) ? project.images as any[] : [];
    deleteUploadedFile(url);
    return this.prisma.project.update({
      where: { id: projectId },
      data: { images: existingImages.filter(img => img.url !== url) as any },
    });
  }

  async setBrochure(projectId: string, file: Express.Multer.File) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    if (project.brochureUrl) deleteUploadedFile(project.brochureUrl);
    const url = saveUploadedFile(file, 'project-brochures');
    return this.prisma.project.update({ where: { id: projectId }, data: { brochureUrl: url } });
  }

  async removeBrochure(projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    deleteUploadedFile(project.brochureUrl);
    return this.prisma.project.update({ where: { id: projectId }, data: { brochureUrl: null } });
  }

  // ── Towers ──────────────────────────────────────────────────────────────

  async createTower(projectId: string, data: { name: string; totalFloors?: number }) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    return this.prisma.tower.create({ data: { ...data, projectId } });
  }

  async updateTower(id: string, data: any) {
    const tower = await this.prisma.tower.findUnique({ where: { id } });
    if (!tower) throw new NotFoundException('Tower not found');
    return this.prisma.tower.update({ where: { id }, data });
  }

  async removeTower(id: string) {
    const tower = await this.prisma.tower.findUnique({ where: { id } });
    if (!tower) throw new NotFoundException('Tower not found');
    return this.prisma.tower.delete({ where: { id } });
  }

  // ── Units ───────────────────────────────────────────────────────────────

  async createUnit(projectId: string, data: {
    tenantId: string;
    towerId?: string;
    unitNumber: string;
    floor?: number;
    unitType?: string;
    areaSqft?: number;
    price?: number;
    currency?: string;
    facing?: string;
  }) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');

    const unit = await this.prisma.unit.create({
      data: { ...data, projectId, status: 'AVAILABLE' },
    });
    await this.prisma.unitStatusHistory.create({
      data: { unitId: unit.id, fromStatus: null, toStatus: 'AVAILABLE' },
    });
    return unit;
  }

  /**
   * Bulk-create units for a project (from a parsed CSV) — dropping a 200-unit
   * tower in one at a time is what actually blocks builders from onboarding.
   * Rows resolve/create towers by name, skip duplicate unit numbers instead of
   * failing the whole batch, and log status history exactly like a single create.
   */
  async bulkImportUnits(projectId: string, rows: Array<{
    towerName?: string;
    unitNumber: string;
    floor?: number;
    unitType?: string;
    areaSqft?: number;
    price?: number;
    currency?: string;
    facing?: string;
  }>) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');

    const existingTowers = await this.prisma.tower.findMany({ where: { projectId } });
    const towerByName = new Map(existingTowers.map(t => [t.name.toLowerCase(), t]));

    const existingUnits = await this.prisma.unit.findMany({ where: { projectId }, select: { unitNumber: true } });
    const existingUnitNumbers = new Set(existingUnits.map(u => u.unitNumber));

    let created = 0;
    const skipped: Array<{ unitNumber: string; reason: string }> = [];

    for (const row of rows) {
      if (!row.unitNumber) { skipped.push({ unitNumber: '(blank)', reason: 'missing unitNumber' }); continue; }
      if (existingUnitNumbers.has(row.unitNumber)) { skipped.push({ unitNumber: row.unitNumber, reason: 'duplicate unit number' }); continue; }

      let towerId: string | undefined;
      if (row.towerName) {
        const key = row.towerName.toLowerCase();
        let tower = towerByName.get(key);
        if (!tower) {
          tower = await this.prisma.tower.create({ data: { name: row.towerName, projectId } });
          towerByName.set(key, tower);
        }
        towerId = tower.id;
      }

      const unit = await this.prisma.unit.create({
        data: {
          projectId,
          tenantId: project.tenantId,
          towerId,
          unitNumber: row.unitNumber,
          floor: row.floor,
          unitType: row.unitType,
          areaSqft: row.areaSqft,
          price: row.price,
          currency: row.currency || 'INR',
          facing: row.facing,
          status: 'AVAILABLE',
        },
      });
      await this.prisma.unitStatusHistory.create({
        data: { unitId: unit.id, fromStatus: null, toStatus: 'AVAILABLE' },
      });
      existingUnitNumbers.add(row.unitNumber);
      created++;
    }

    return { created, skippedCount: skipped.length, skipped };
  }

  async findUnits(query: {
    tenantId: string;
    projectId?: string;
    towerId?: string;
    status?: string;
    unitType?: string;
    minPrice?: number;
    maxPrice?: number;
    minArea?: number;
    maxArea?: number;
    page?: number;
    limit?: number;
  }) {
    const { tenantId, projectId, towerId, status, unitType, page = 1, limit = 50 } = query;
    // Query params arrive as strings over HTTP; this method also gets called
    // in-process with real numbers (e.g. from the agent tools), so coerce
    // rather than trust the type — a raw string reaching Prisma's numeric
    // filter throws PrismaClientValidationError, which prod masks as a bare
    // "Validation failed" with no indication of what actually broke.
    const minPrice = query.minPrice !== undefined ? Number(query.minPrice) : undefined;
    const maxPrice = query.maxPrice !== undefined ? Number(query.maxPrice) : undefined;
    const minArea = query.minArea !== undefined ? Number(query.minArea) : undefined;
    const maxArea = query.maxArea !== undefined ? Number(query.maxArea) : undefined;
    const where: Prisma.UnitWhereInput = { tenantId };
    if (projectId) where.projectId = projectId;
    if (towerId) where.towerId = towerId;
    if (status) where.status = status as any;
    if (unitType) where.unitType = unitType;
    if ((minPrice !== undefined && !isNaN(minPrice)) || (maxPrice !== undefined && !isNaN(maxPrice))) {
      where.price = {};
      if (minPrice !== undefined && !isNaN(minPrice)) where.price.gte = minPrice;
      if (maxPrice !== undefined && !isNaN(maxPrice)) where.price.lte = maxPrice;
    }
    if ((minArea !== undefined && !isNaN(minArea)) || (maxArea !== undefined && !isNaN(maxArea))) {
      where.areaSqft = {};
      if (minArea !== undefined && !isNaN(minArea)) where.areaSqft.gte = minArea;
      if (maxArea !== undefined && !isNaN(maxArea)) where.areaSqft.lte = maxArea;
    }

    const [data, total] = await Promise.all([
      this.prisma.unit.findMany({
        where,
        skip: (+page - 1) * +limit,
        take: +limit,
        orderBy: [{ floor: 'asc' }, { unitNumber: 'asc' }],
        include: { project: { select: { id: true, name: true } }, tower: { select: { id: true, name: true } } },
      }),
      this.prisma.unit.count({ where }),
    ]);
    return { data, meta: { total, page: +page, limit: +limit } };
  }

  async findUnit(id: string) {
    const unit = await this.prisma.unit.findUnique({
      where: { id },
      include: { project: true, tower: true, lead: { include: { contact: true } } },
    });
    if (!unit) throw new NotFoundException('Unit not found');
    return unit;
  }

  /**
   * Update a unit — status transitions are logged to UnitStatusHistory (this is
   * what makes inventory velocity a real report instead of a spreadsheet), and
   * booking/selling a unit auto-links the buyer's lead + timestamps.
   */
  async updateUnit(id: string, data: {
    unitNumber?: string;
    floor?: number;
    unitType?: string;
    areaSqft?: number;
    price?: number;
    facing?: string;
    status?: string;
    leadId?: string | null;
  }) {
    const existing = await this.prisma.unit.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Unit not found');

    const updateData: any = { ...data };
    const statusChanged = data.status && data.status !== existing.status;

    if (statusChanged) {
      if (data.status === UnitStatus.BOOKED) updateData.bookedAt = new Date();
      if (data.status === UnitStatus.SOLD) updateData.soldAt = new Date();
      if (data.status === UnitStatus.AVAILABLE) { updateData.leadId = null; updateData.bookedAt = null; updateData.soldAt = null; }
    }

    const updated = await this.prisma.unit.update({ where: { id }, data: updateData });

    if (statusChanged) {
      await this.prisma.unitStatusHistory.create({
        data: { unitId: id, fromStatus: existing.status, toStatus: updated.status },
      });
    }

    return updated;
  }

  async removeUnit(id: string) {
    const existing = await this.prisma.unit.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Unit not found');
    return this.prisma.unit.delete({ where: { id } });
  }

  // ── Availability grid & inventory velocity ─────────────────────────────

  /** Tower → floor → units matrix, for the visual availability grid. */
  async getAvailabilityGrid(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        towers: { orderBy: { name: 'asc' } },
        units: {
          orderBy: [{ floor: 'asc' }, { unitNumber: 'asc' }],
          include: { lead: { include: { contact: { select: { name: true } } } } },
        },
      },
    });
    if (!project) throw new NotFoundException('Project not found');

    const buildGrid = (units: typeof project.units) => {
      const byFloor = new Map<number, typeof project.units>();
      for (const u of units) {
        const floor = u.floor ?? -1;
        if (!byFloor.has(floor)) byFloor.set(floor, []);
        byFloor.get(floor)!.push(u);
      }
      return Array.from(byFloor.entries())
        .sort((a, b) => b[0] - a[0])
        .map(([floor, floorUnits]) => ({
          floor,
          units: floorUnits.map(u => ({
            id: u.id, unitNumber: u.unitNumber, unitType: u.unitType, status: u.status,
            price: u.price, areaSqft: u.areaSqft, buyerName: u.lead?.contact?.name || null,
          })),
        }));
    };

    if (project.towers.length === 0) {
      // No towers — flat single-block project.
      return { projectId, projectName: project.name, towers: [{ towerId: null, towerName: null, floors: buildGrid(project.units) }] };
    }

    return {
      projectId,
      projectName: project.name,
      towers: project.towers.map(t => ({
        towerId: t.id,
        towerName: t.name,
        floors: buildGrid(project.units.filter(u => u.towerId === t.id)),
      })),
    };
  }

  /**
   * Inventory velocity: current status breakdown + units sold/booked per month
   * over the trailing 12 months, derived from UnitStatusHistory.
   */
  async getVelocity(projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');

    const [statusBreakdown, totalUnits] = await Promise.all([
      this.prisma.unit.groupBy({ by: ['status'], where: { projectId }, _count: { id: true } }),
      this.prisma.unit.count({ where: { projectId } }),
    ]);

    const summary: Record<string, number> = { AVAILABLE: 0, BLOCKED: 0, BOOKED: 0, SOLD: 0, ON_HOLD: 0 };
    for (const g of statusBreakdown) summary[g.status] = g._count.id;

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const history = await this.prisma.unitStatusHistory.findMany({
      where: {
        unit: { projectId },
        changedAt: { gte: twelveMonthsAgo },
        toStatus: { in: ['BOOKED', 'SOLD'] },
      },
      select: { toStatus: true, changedAt: true },
      orderBy: { changedAt: 'asc' },
    });

    const byMonth = new Map<string, { booked: number; sold: number }>();
    for (const h of history) {
      const key = `${h.changedAt.getFullYear()}-${String(h.changedAt.getMonth() + 1).padStart(2, '0')}`;
      if (!byMonth.has(key)) byMonth.set(key, { booked: 0, sold: 0 });
      const entry = byMonth.get(key)!;
      if (h.toStatus === 'BOOKED') entry.booked++;
      if (h.toStatus === 'SOLD') entry.sold++;
    }

    const monthly = Array.from(byMonth.entries()).map(([month, counts]) => ({ month, ...counts }));
    const soldOrBooked = summary.SOLD + summary.BOOKED;

    return {
      projectId,
      totalUnits,
      statusBreakdown: summary,
      percentSold: totalUnits > 0 ? Math.round((summary.SOLD / totalUnits) * 100) : 0,
      percentMoving: totalUnits > 0 ? Math.round((soldOrBooked / totalUnits) * 100) : 0,
      monthly,
    };
  }
}

import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PRESETS } from './presets';

@Injectable()
export class ModulePermissionsService {
  constructor(private prisma: PrismaService) {}

  listPresets() { return Object.entries(PRESETS).map(([name, p]) => ({ name, ...p })); }

  listForUser(userId: string) { return this.prisma.modulePermission.findMany({ where: { userId } }); }

  async setPermission(userId: string, module: string, level: string) {
    return this.prisma.modulePermission.upsert({
      where: { userId_module: { userId, module: module as any } },
      update: { level: level as any },
      create: { userId, module: module as any, level: level as any, tenantId: (await this.prisma.user.findUniqueOrThrow({ where: { id: userId } })).tenantId },
    });
  }

  async applyPreset(userId: string, presetName: string) {
    const preset = PRESETS[presetName];
    if (!preset) throw new BadRequestException(`Unknown preset "${presetName}"`);
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const rows = await Promise.all(
      Object.entries(preset.grants).map(([module, level]) =>
        this.prisma.modulePermission.upsert({
          where: { userId_module: { userId, module: module as any } },
          update: { level: level as any },
          create: { userId, module: module as any, level: level as any, tenantId: user.tenantId },
        }),
      ),
    );
    return rows;
  }

  // Checks whether a user has at least `minLevel` on a module — used by a future guard;
  // exposed now so routes can start adopting it without waiting on the UI.
  async hasAccess(userId: string, module: string, minLevel: 'VIEW_ONLY' | 'EDIT' | 'FULL_ACCESS') {
    const order = ['NO_ACCESS', 'VIEW_ONLY', 'EDIT', 'FULL_ACCESS'];
    const perm = await this.prisma.modulePermission.findUnique({ where: { userId_module: { userId, module: module as any } } });
    const level = perm?.level || 'NO_ACCESS';
    return order.indexOf(level) >= order.indexOf(minLevel);
  }
}

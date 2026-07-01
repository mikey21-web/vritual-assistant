import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  active: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({ select: SAFE_USER_SELECT });
  }

  async findOne(id: string) {
    const u = await this.prisma.user.findUnique({ where: { id }, select: SAFE_USER_SELECT });
    if (!u) throw new NotFoundException('User not found');
    return u;
  }

  async create(data: { name: string; email: string; password?: string; role?: string; active?: boolean }) {
    if (!data.password) throw new BadRequestException('Password is required');
    const password = await bcrypt.hash(data.password, 12);
    const { role, active, ...safeData } = data;
    return this.prisma.user.create({
      data: { ...safeData, password, role: (role as any) || 'SALES_AGENT', active: active !== false, tenantId: 'default-tenant' },
      select: SAFE_USER_SELECT,
    });
  }

  async update(id: string, data: { name?: string; email?: string; password?: string }) {
    await this.findOne(id);
    const { password, ...rest } = data;
    const updateData: any = { ...rest };
    if (password) updateData.password = await bcrypt.hash(password, 12);
    return this.prisma.user.update({ where: { id }, data: updateData, select: SAFE_USER_SELECT });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.user.delete({ where: { id }, select: SAFE_USER_SELECT });
  }
}

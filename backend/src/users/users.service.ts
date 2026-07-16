import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { tenantConnect } from '../shared/tenant-helper';
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
  department: true,
  salaryType: true,
  monthlySalary: true,
  joinedDate: true,
  skills: true,
  annualLeaveQuota: true,
  teamStatus: true,
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

  async create(data: { name: string; email: string; password?: string; role?: string; active?: boolean; phone?: string; department?: string; salaryType?: string; monthlySalary?: number; joinedDate?: string; skills?: string[]; annualLeaveQuota?: number; teamStatus?: string }, req?: any) {
    if (!data.password) throw new BadRequestException('Password is required');
    const password = await bcrypt.hash(data.password, 12);
    const { role, active, ...safeData } = data;
    const resolvedRole = role || 'SALES_AGENT';
    // Only an OWNER may create another OWNER or ADMIN account. Without this, an ADMIN
    // could grant themselves or anyone else OWNER-level access via POST /users.
    if ((resolvedRole === 'OWNER' || resolvedRole === 'ADMIN') && req?.user?.role !== 'OWNER') {
      throw new ForbiddenException('Only an OWNER can create OWNER or ADMIN accounts');
    }
    return this.prisma.user.create({
      data: { ...safeData, password, role: resolvedRole as any, active: active !== false, ...tenantConnect(req) },
      select: SAFE_USER_SELECT,
    });
  }

  async update(id: string, data: { name?: string; email?: string; password?: string; phone?: string; department?: string; salaryType?: string; monthlySalary?: number; joinedDate?: string; skills?: string[]; annualLeaveQuota?: number; teamStatus?: string }) {
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

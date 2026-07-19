import { Injectable, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class PartnerAuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private auditLogs: AuditLogsService,
  ) {}

  /** Owner/admin only — enforced by @Roles. Creates the partner's own login, separate from internal User accounts. */
  async createPortalUser(tenantId: string, data: { channelPartnerId: string; email: string; password: string }, actorId?: string) {
    const partner = await this.prisma.channelPartner.findFirst({ where: { id: data.channelPartnerId, tenantId } });
    if (!partner) throw new NotFoundException('Channel partner not found');

    const existing = await this.prisma.partnerPortalUser.findUnique({ where: { email: data.email } });
    if (existing) throw new ConflictException('A partner portal account with this email already exists');

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await this.prisma.partnerPortalUser.create({
      data: { tenantId, channelPartnerId: data.channelPartnerId, email: data.email, passwordHash },
    });
    await this.auditLogs.log('CREATE', 'PartnerPortalUser', user.id, actorId, { channelPartnerId: data.channelPartnerId });
    return { id: user.id, email: user.email, channelPartnerId: user.channelPartnerId };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.partnerPortalUser.findUnique({ where: { email } });
    if (!user || !user.active) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    await this.prisma.partnerPortalUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const accessToken = this.jwt.sign({
      sub: user.id,
      scope: 'partner',
      tenantId: user.tenantId,
      channelPartnerId: user.channelPartnerId,
    }, { expiresIn: '12h' });

    return { accessToken, partner: { id: user.id, email: user.email, channelPartnerId: user.channelPartnerId } };
  }
}

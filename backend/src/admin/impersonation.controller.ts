import { Controller, Post, Param, Body, UseGuards, Logger, BadRequestException, ForbiddenException, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

// Lower number = more privileged. Only OWNER may impersonate an OWNER or ADMIN;
// nobody may impersonate a peer or more-privileged role.
const ROLE_RANK: Record<string, number> = {
  OWNER: 0,
  ADMIN: 1,
  MANAGER: 2,
  SALES_AGENT: 3,
  SUPPORT_AGENT: 3,
  VIEWER: 4,
};

@ApiTags('Admin')
@Controller('admin/impersonate')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ImpersonationController {
  private readonly logger = new Logger(ImpersonationController.name);

  constructor(private prisma: PrismaService, private auditLogs: AuditLogsService) {}

  @Post(':userId')
  @Roles('OWNER', 'ADMIN')
  async impersonate(@Param('userId') userId: string, @Req() req: any, @Body() body: { reason: string }) {
    if (!body.reason) throw new BadRequestException('Reason is required for impersonation');

    const target = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!target) throw new BadRequestException('User not found');

    const callerRank = ROLE_RANK[req.user.role] ?? 99;
    const targetRank = ROLE_RANK[target.role] ?? 99;
    if (targetRank <= callerRank) {
      throw new ForbiddenException('Cannot impersonate a user with equal or higher privilege than your own role');
    }

    await this.auditLogs.log('admin_impersonation', 'User', userId, req.user.sub, { reason: body.reason });

    this.logger.warn(`Admin ${req.user.sub} started impersonating ${userId}. Reason: ${body.reason}`);

    // Generate a special impersonation token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { sub: userId, email: target.email, role: target.role, impersonatedBy: req.user.sub },
      process.env.JWT_SECRET,
      { expiresIn: '1h' },
    );

    return { token, message: 'Impersonation token valid for 1 hour.', reason: body.reason };
  }

  @Post('stop')
  @Roles('OWNER', 'ADMIN')
  async stopImpersonation(@Req() req: any) {
    await this.auditLogs.log('admin_impersonation_stopped', 'User', req.user.sub, req.user.impersonatedBy || req.user.sub);
    return { message: 'Impersonation ended.' };
  }
}

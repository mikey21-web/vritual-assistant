import { Controller, Post, Param, Body, UseGuards, Logger, BadRequestException, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

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

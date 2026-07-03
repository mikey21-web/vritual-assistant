import { Controller, Get, Post, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@ApiTags('API Keys')
@Controller('tenants/me/api-keys')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ApiKeysController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @Roles('OWNER', 'ADMIN')
  async list(@Req() req: any) {
    return this.prisma.tenantApiKey.findMany({
      where: { tenantId: req.user.tenantId },
      select: { id: true, name: true, prefix: true, createdAt: true, lastUsedAt: true },
    });
  }

  @Post()
  @Roles('OWNER', 'ADMIN')
  async create(@Req() req: any, @Body() body: { name: string }) {
    const token = 'la_' + crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const prefix = token.substring(0, 7);
    const key = await this.prisma.tenantApiKey.create({
      data: { tenantId: req.user.tenantId, name: body.name, keyHash: hash, prefix },
    });
    return { id: key.id, name: key.name, token: token, prefix, message: 'Save this token — it will not be shown again.' };
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  async revoke(@Req() req: any, @Param('id') id: string) {
    await this.prisma.tenantApiKey.updateMany({
      where: { id, tenantId: req.user.tenantId },
      data: { revokedAt: new Date() },
    });
    return { message: 'API key revoked.' };
  }
}

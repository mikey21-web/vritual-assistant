import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// Authenticates a paired mobile device via `x-api-key`, distinct from JwtAuthGuard's
// user-session auth — the phone never has a user JWT, only its own long-lived device key.
@Injectable()
export class DeviceAuthGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];
    if (!apiKey || typeof apiKey !== 'string') {
      throw new UnauthorizedException('Missing device API key');
    }

    const device = await this.prisma.device.findUnique({ where: { apiKeyHash: hashApiKey(apiKey) } });
    if (!device || device.revokedAt) {
      throw new UnauthorizedException('Invalid or revoked device API key');
    }

    request.device = device;
    this.prisma.device.update({ where: { id: device.id }, data: { lastSeenAt: new Date() } }).catch(() => undefined);
    return true;
  }
}

export { hashApiKey };

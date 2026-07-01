import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'node:crypto';

@Injectable()
export class MfaService {
  private readonly logger = new Logger(MfaService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  /** Generate a TOTP-compatible base32 secret */
  generateSecret(): string {
    const bytes = crypto.randomBytes(20);
    return this.base32Encode(bytes);
  }

  /** Verify a TOTP code against a secret */
  verifyTotp(token: string, secret: string): boolean {
    const decoded = this.base32Decode(secret);
    const epoch = Math.floor(Date.now() / 1000);
    // Check current and adjacent 30-second windows (window=1)
    for (let offset = -1; offset <= 1; offset++) {
      const counter = BigInt(Math.floor(epoch / 30) + offset);
      const expected = this.generateTOTP(decoded, counter, 6);
      if (this.timingSafeEqual(token, expected)) return true;
    }
    return false;
  }

  /** Generate a TOTP code for a given secret and counter */
  private generateTOTP(secret: Uint8Array, counter: bigint, digits: number): string {
    // Step 1: HMAC-SHA1
    const counterBytes = new Uint8Array(8);
    for (let i = 7; i >= 0; i--) {
      counterBytes[i] = Number(counter & 0xffn);
      counter >>= 8n;
    }
    const hmac = crypto.createHmac('sha1', secret).update(counterBytes).digest();

    // Step 2: Dynamic truncation
    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);

    // Step 3: Modulo
    const otp = binary % Math.pow(10, digits);
    return otp.toString().padStart(digits, '0');
  }

  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }

  /** RFC 4648 base32 encoding */
  private base32Encode(bytes: Uint8Array): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let value = 0;
    let output = '';
    for (const byte of bytes) {
      value = (value << 8) | byte;
      bits += 8;
      while (bits >= 5) {
        output += alphabet[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }
    if (bits > 0) output += alphabet[(value << (5 - bits)) & 31];
    return output;
  }

  /** RFC 4648 base32 decoding */
  private base32Decode(str: string): Uint8Array {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const lookup = new Map<string, number>();
    for (let i = 0; i < alphabet.length; i++) lookup.set(alphabet[i], i);

    const cleaned = str.replace(/=+$/, '').toUpperCase();
    const bytes: number[] = [];
    let bits = 0;
    let value = 0;
    for (const char of cleaned) {
      const idx = lookup.get(char);
      if (idx === undefined) continue;
      value = (value << 5) | idx;
      bits += 5;
      if (bits >= 8) {
        bytes.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }
    return new Uint8Array(bytes);
  }

  async generateMfaToken(userId: string): Promise<{ secret: string; uri: string; qrCodeUrl: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    if (user.mfaEnabled) throw new BadRequestException('MFA already enabled');

    const secret = this.generateSecret();
    const appName = this.config.get<string>('APP_NAME', 'LeadAuto');
    const qrCodeUrl = `otpauth://totp/${encodeURIComponent(appName)}:${encodeURIComponent(user.email)}?secret=${secret}&issuer=${encodeURIComponent(appName)}`;

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: secret },
    });

    return { secret, uri: qrCodeUrl, qrCodeUrl };
  }

  async verifyAndEnable(userId: string, token: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    if (!user.mfaSecret) throw new BadRequestException('MFA not set up. Generate a secret first.');
    if (user.mfaEnabled) throw new BadRequestException('MFA already enabled');

    const isValid = this.verifyTotp(token, user.mfaSecret);
    if (!isValid) throw new BadRequestException('Invalid verification code');

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true },
    });

    this.logger.log(`MFA enabled for user ${userId}`);
    return { message: 'MFA enabled successfully.' };
  }

  async disable(userId: string, token: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    if (!user.mfaEnabled) throw new BadRequestException('MFA not enabled');

    if (user.mfaSecret) {
      const isValid = this.verifyTotp(token, user.mfaSecret);
      if (!isValid) throw new BadRequestException('Invalid verification code');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: false, mfaSecret: null },
    });

    this.logger.log(`MFA disabled for user ${userId}`);
    return { message: 'MFA disabled successfully.' };
  }

  async verifyToken(secret: string, token: string): Promise<boolean> {
    try {
      return this.verifyTotp(token, secret);
    } catch {
      return false;
    }
  }

  generateMfaChallengeToken(userId: string): string {
    return this.jwtService.sign(
      { sub: userId, purpose: 'mfa_challenge' },
      { expiresIn: '5m' },
    );
  }
}

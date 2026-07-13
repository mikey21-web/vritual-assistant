import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as QRCode from 'qrcode';

@Injectable()
export class QrCodesService {
  constructor(private prisma: PrismaService, private config: ConfigService) {}

  findAll() { return this.prisma.qrCode.findMany({ include: { _count: { select: { scans: true } } } }); }

  async findOne(id: string) {
    const q = await this.prisma.qrCode.findUnique({ where: { id }, include: { campaigns: true } });
    if (!q) throw new NotFoundException('QR code not found');
    return q;
  }

  create(data: any) { return this.prisma.qrCode.create({ data }); }

  async update(id: string, data: any) { await this.findOne(id); return this.prisma.qrCode.update({ where: { id }, data }); }

  // The printed/scannable QR image encodes this redirect link instead of the raw
  // destination, so a real scan (1) gets tracked as a QrScan and (2) tags the
  // destination URL with ?qr=<id> so the page it lands on (a hosted form, the chat
  // widget) can attribute any resulting lead back to this QR code as its source.
  private redirectUrl(id: string): string {
    const base = this.config.get<string>('PUBLIC_URL', 'http://localhost:3001');
    return `${base}/api/qr-codes/${id}/go`;
  }

  async generateImage(id: string) {
    const qr = await this.findOne(id);
    const image = await QRCode.toDataURL(this.redirectUrl(id), { width: 512 });
    return { qrCode: qr, image };
  }

  async recordScan(id: string, meta: any = {}) {
    await this.findOne(id);
    return this.prisma.qrScan.create({ data: { qrCodeId: id, country: meta.country, city: meta.city, userAgent: meta.userAgent } });
  }

  // Called when someone actually scans the printed QR code. Logs the scan, then
  // redirects to the real destination with a ?qr=<id> hint attached.
  async scanAndRedirect(id: string, userAgent?: string): Promise<string> {
    const qr = await this.findOne(id);
    await this.prisma.qrScan.create({ data: { qrCodeId: id, userAgent } });
    const separator = qr.destination.includes('?') ? '&' : '?';
    return `${qr.destination}${separator}qr=${id}`;
  }
}

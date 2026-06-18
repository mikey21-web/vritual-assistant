import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as QRCode from 'qrcode';

@Injectable()
export class QrCodesService {
  constructor(private prisma: PrismaService) {}

  findAll() { return this.prisma.qrCode.findMany({ include: { _count: { select: { scans: true } } } }); }

  async findOne(id: string) {
    const q = await this.prisma.qrCode.findUnique({ where: { id }, include: { campaigns: true } });
    if (!q) throw new NotFoundException('QR code not found');
    return q;
  }

  create(data: any) { return this.prisma.qrCode.create({ data }); }

  async update(id: string, data: any) { await this.findOne(id); return this.prisma.qrCode.update({ where: { id }, data }); }

  async generateImage(id: string) {
    const qr = await this.findOne(id);
    const image = await QRCode.toDataURL(qr.destination, { width: 512 });
    return { qrCode: qr, image };
  }

  async recordScan(id: string, meta: any = {}) {
    await this.findOne(id);
    return this.prisma.qrScan.create({ data: { qrCodeId: id, country: meta.country, city: meta.city, userAgent: meta.userAgent } });
  }
}

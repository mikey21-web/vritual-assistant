import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { QrCodesService } from './qr-codes.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import * as QRCode from 'qrcode';

jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,iVBORw0KGgo='),
}));

describe('QrCodesService', () => {
  let service: QrCodesService;
  let prisma: any;

  const mockQrCode = {
    id: 'qr-1',
    name: 'Landing Page QR',
    destination: 'https://example.com/landing',
    active: true,
    tenantId: 'default-tenant',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    campaigns: [],
    _count: { scans: 5 },
  };

  const mockScan = {
    id: 'scan-1',
    qrCodeId: 'qr-1',
    country: 'US',
    city: 'New York',
    userAgent: 'Mozilla/5.0',
    scannedAt: new Date('2025-01-01T00:00:00Z'),
  };

  beforeEach(async () => {
    prisma = {
      qrCode: {
        findMany: jest.fn().mockResolvedValue([mockQrCode]),
        findUnique: jest.fn().mockResolvedValue(mockQrCode),
        create: jest.fn().mockResolvedValue(mockQrCode),
        update: jest.fn().mockResolvedValue(mockQrCode),
      },
      qrScan: {
        create: jest.fn().mockResolvedValue(mockScan),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QrCodesService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { get: jest.fn((_key: string, def?: string) => def) } },
      ],
    }).compile();

    service = module.get<QrCodesService>(QrCodesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── findAll ─────────────────────────────────────

  it('should find all QR codes with scan count', async () => {
    const qrs = await service.findAll();
    expect(qrs).toHaveLength(1);
    expect(qrs[0]._count.scans).toBe(5);
    expect(prisma.qrCode.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: { _count: { select: { scans: true } } },
      }),
    );
  });

  it('should return empty array when no QR codes exist', async () => {
    prisma.qrCode.findMany.mockResolvedValue([]);
    const result = await service.findAll();
    expect(result).toEqual([]);
  });

  // ── findOne ─────────────────────────────────────

  it('should find a QR code by id with campaigns', async () => {
    const qr = await service.findOne('qr-1');
    expect(qr.id).toBe('qr-1');
    expect(qr.destination).toBe('https://example.com/landing');
    expect(prisma.qrCode.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'qr-1' },
        include: { campaigns: true },
      }),
    );
  });

  it('should throw NotFoundException when QR code not found', async () => {
    prisma.qrCode.findUnique.mockResolvedValue(null);
    await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
  });

  // ── create ──────────────────────────────────────

  it('should create a QR code', async () => {
    const qr = await service.create({
      name: 'New QR',
      destination: 'https://example.com/page',
      tenantId: 'default-tenant',
    });
    expect(qr.name).toBe('Landing Page QR');
    expect(prisma.qrCode.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { name: 'New QR', destination: 'https://example.com/page', tenantId: 'default-tenant' },
      }),
    );
  });

  it('should create a QR code with active status', async () => {
    await service.create({ name: 'Active QR', destination: 'https://example.com', active: true });
    expect(prisma.qrCode.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ active: true }),
      }),
    );
  });

  // ── update ──────────────────────────────────────

  it('should update a QR code', async () => {
    prisma.qrCode.update.mockResolvedValue({ ...mockQrCode, name: 'Updated QR' });
    const qr = await service.update('qr-1', { name: 'Updated QR' });
    expect(prisma.qrCode.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'qr-1' },
        data: { name: 'Updated QR' },
      }),
    );
  });

  it('should throw NotFoundException when updating non-existent QR code', async () => {
    prisma.qrCode.findUnique.mockResolvedValue(null);
    await expect(service.update('nonexistent', { name: 'Nope' })).rejects.toThrow(NotFoundException);
  });

  it('should verify existence before updating', async () => {
    await service.update('qr-1', { destination: 'https://new-url.com' });
    expect(prisma.qrCode.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'qr-1' } }),
    );
  });

  // ── generateImage ───────────────────────────────

  it('should generate QR code image as data URL', async () => {
    const result = await service.generateImage('qr-1');
    expect(result.qrCode.id).toBe('qr-1');
    expect(result.image).toBe('data:image/png;base64,iVBORw0KGgo=');
  });

  it('should call QRCode.toDataURL with the tracking redirect link, not the raw destination', async () => {
    await service.generateImage('qr-1');
    expect(QRCode.toDataURL).toHaveBeenCalledWith(
      'http://localhost:3001/api/qr-codes/qr-1/go',
      { width: 512 },
    );
  });

  it('should throw NotFoundException when generating image for non-existent QR', async () => {
    prisma.qrCode.findUnique.mockResolvedValue(null);
    await expect(service.generateImage('nonexistent')).rejects.toThrow(NotFoundException);
  });

  it('should return the QR code record alongside the image', async () => {
    const result = await service.generateImage('qr-1');
    expect(result.qrCode).toBeDefined();
    expect(result.qrCode.destination).toBe('https://example.com/landing');
  });

  // ── recordScan ──────────────────────────────────

  it('should record a scan with metadata', async () => {
    const scan = await service.recordScan('qr-1', {
      country: 'US',
      city: 'New York',
      userAgent: 'Mozilla/5.0',
    });
    expect(scan.id).toBe('scan-1');
    expect(prisma.qrScan.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          qrCodeId: 'qr-1',
          country: 'US',
          city: 'New York',
          userAgent: 'Mozilla/5.0',
        },
      }),
    );
  });

  it('should record a scan without optional metadata', async () => {
    await service.recordScan('qr-1', {});
    expect(prisma.qrScan.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          qrCodeId: 'qr-1',
          country: undefined,
          city: undefined,
          userAgent: undefined,
        },
      }),
    );
  });

  it('should record a scan without any metadata argument', async () => {
    await service.recordScan('qr-1');
    expect(prisma.qrScan.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          qrCodeId: 'qr-1',
          country: undefined,
          city: undefined,
          userAgent: undefined,
        },
      }),
    );
  });

  it('should throw NotFoundException when recording scan for non-existent QR', async () => {
    prisma.qrCode.findUnique.mockResolvedValue(null);
    await expect(service.recordScan('nonexistent')).rejects.toThrow(NotFoundException);
  });

  it('should verify QR code exists before recording scan', async () => {
    await service.recordScan('qr-1', { country: 'IN' });
    expect(prisma.qrCode.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'qr-1' } }),
    );
  });

  // ── scanAndRedirect ─────────────────────────────

  it('should log a scan and return the destination tagged with ?qr=<id>', async () => {
    const target = await service.scanAndRedirect('qr-1', 'Mozilla/5.0');
    expect(target).toBe('https://example.com/landing?qr=qr-1');
    expect(prisma.qrScan.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { qrCodeId: 'qr-1', userAgent: 'Mozilla/5.0' } }),
    );
  });

  it('should append the qr tag with & when the destination already has query params', async () => {
    prisma.qrCode.findUnique.mockResolvedValue({ ...mockQrCode, destination: 'https://example.com/landing?utm=x' });
    const target = await service.scanAndRedirect('qr-1');
    expect(target).toBe('https://example.com/landing?utm=x&qr=qr-1');
  });

  it('should throw NotFoundException when redirecting a non-existent QR code', async () => {
    prisma.qrCode.findUnique.mockResolvedValue(null);
    await expect(service.scanAndRedirect('nonexistent')).rejects.toThrow(NotFoundException);
  });
});

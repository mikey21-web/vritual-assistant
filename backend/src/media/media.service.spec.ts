import { Test, TestingModule } from '@nestjs/testing';
import { MediaService } from './media.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { SignedUrlService } from '../shared/signed-url.service';

jest.mock('fs');

describe('MediaService', () => {
  let service: MediaService;
  let prisma: any;
  const auditLogs = { log: jest.fn().mockResolvedValue({}) };
  const signedUrl = { sign: jest.fn(), verify: jest.fn() };

  beforeEach(async () => {
    prisma = {
      mediaFile: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        create: jest.fn().mockImplementation(d => Promise.resolve({ id: 'media-1', ...d.data })),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        MediaService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { get: () => './uploads' } },
        { provide: AuditLogsService, useValue: auditLogs },
        { provide: SignedUrlService, useValue: signedUrl },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
  });

  it('should reject executable files', async () => {
    const mockFile = { originalname: 'test.exe', mimetype: 'application/x-msdownload', buffer: Buffer.from(''), size: 100 } as Express.Multer.File;
    await expect(service.upload(mockFile, 'user-1')).rejects.toThrow(BadRequestException);
  });

  it('should reject invalid file types', async () => {
    const mockFile = { originalname: 'test.xyz', mimetype: 'application/octet-stream', buffer: Buffer.from(''), size: 100 } as Express.Multer.File;
    await expect(service.upload(mockFile, 'user-1')).rejects.toThrow(BadRequestException);
  });

  it('should reject oversized files', async () => {
    const largeBuffer = Buffer.alloc(51 * 1024 * 1024);
    const mockFile = { originalname: 'large.pdf', mimetype: 'application/pdf', buffer: largeBuffer, size: largeBuffer.length } as Express.Multer.File;
    await expect(service.upload(mockFile, 'user-1')).rejects.toThrow(BadRequestException);
  });

  it('should accept valid PDF upload', async () => {
    const mockFile = { originalname: 'doc.pdf', mimetype: 'application/pdf', buffer: Buffer.from('pdf'), size: 100 } as Express.Multer.File;
    const result = await service.upload(mockFile, 'user-1', { category: 'PROPOSAL' });
    expect(result.fileType).toBe('pdf');
    expect(result.id).toBe('media-1');
  });

  it('should attach media to lead', async () => {
    prisma.mediaFile.findUnique.mockResolvedValue({ id: 'media-1' });
    prisma.mediaFile.update.mockResolvedValue({ id: 'media-1', leadId: 'lead-1' });
    const result = await service.attach('media-1', { leadId: 'lead-1' });
    expect(result.leadId).toBe('lead-1');
  });
});

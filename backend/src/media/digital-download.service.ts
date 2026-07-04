import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { SignedUrlService } from '../shared/signed-url.service';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class DigitalDownloadService {
  private readonly logger = new Logger(DigitalDownloadService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private signedUrl: SignedUrlService,
  ) {}

  // ---------------------------------------------------------------------------
  // CREATE DOWNLOAD LINK
  // ---------------------------------------------------------------------------
  async createDownloadLink(mediaId: string, leadId: string) {
    const mediaFile = await this.prisma.mediaFile.findUnique({
      where: { id: mediaId },
    });
    if (!mediaFile) throw new NotFoundException(`Media file ${mediaId} not found`);

    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: { contact: true },
    });
    if (!lead) throw new NotFoundException(`Lead ${leadId} not found`);

    // Generate a unique access key for one-time download
    const accessKey = crypto.randomBytes(32).toString('hex');

    const conversion = await this.prisma.conversion.create({
      data: {
        destination: 'DIGITAL_DOWNLOAD',
        status: 'REQUESTED',
        leadId,
        metadata: {
          mediaId,
          fileName: mediaFile.originalName,
          fileType: mediaFile.fileType,
          fileSize: mediaFile.fileSize,
          storageKey: mediaFile.storageKey,
          storageProvider: mediaFile.storageProvider,
          accessKey,
          downloaded: false,
          downloadCount: 0,
          createdAt: new Date().toISOString(),
        },
      },
      include: { lead: { include: { contact: true } } },
    });

    this.logger.log(`Download link created: ${conversion.id} for media ${mediaId} (lead: ${leadId})`);

    return {
      id: conversion.id,
      mediaId,
      fileName: mediaFile.originalName,
      fileSize: mediaFile.fileSize,
      mimeType: mediaFile.mimeType,
      downloadUrl: `${this.config.get<string>('API_BASE_URL', 'http://localhost:3000')}/digital-downloads/${conversion.id}/download?accessKey=${accessKey}`,
      accessKey,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // GET DOWNLOAD
  // ---------------------------------------------------------------------------
  async getDownload(downloadId: string) {
    const conversion = await this.prisma.conversion.findUnique({
      where: { id: downloadId },
      include: { lead: { include: { contact: true } } },
    });
    if (!conversion) throw new NotFoundException(`Download ${downloadId} not found`);
    if (conversion.destination !== 'DIGITAL_DOWNLOAD') {
      throw new BadRequestException(`Conversion ${downloadId} is not a digital download`);
    }
    return conversion;
  }

  // ---------------------------------------------------------------------------
  // DOWNLOAD FILE
  // ---------------------------------------------------------------------------
  async downloadFile(downloadId: string, accessKey: string) {
    const conversion = await this.prisma.conversion.findUnique({
      where: { id: downloadId },
    });
    if (!conversion) throw new NotFoundException(`Download ${downloadId} not found`);
    if (conversion.destination !== 'DIGITAL_DOWNLOAD') {
      throw new BadRequestException(`Conversion ${downloadId} is not a digital download`);
    }

    const metadata = conversion.metadata as any;

    // Validate access key
    if (metadata.accessKey !== accessKey) {
      throw new BadRequestException('Invalid access key');
    }

    // Check if already downloaded (one-time download)
    if (metadata.downloaded) {
      throw new BadRequestException('This download link has already been used');
    }

    const mediaFile = await this.prisma.mediaFile.findUnique({
      where: { id: metadata.mediaId },
    });
    if (!mediaFile) throw new NotFoundException(`Media file ${metadata.mediaId} not found`);

    // Read file content
    const storagePath = this.config.get<string>('STORAGE_PATH', './uploads');
    const fullPath = path.join(storagePath, metadata.storageKey || mediaFile.storageKey);

    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException('File not found on storage');
    }

    const fileContent = fs.readFileSync(fullPath);

    // Mark as downloaded, increment count
    await this.prisma.conversion.update({
      where: { id: downloadId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        metadata: {
          ...metadata,
          downloaded: true,
          downloadCount: (metadata.downloadCount || 0) + 1,
          downloadedAt: new Date().toISOString(),
        },
      },
    });

    this.logger.log(`File downloaded for conversion ${downloadId}: ${mediaFile.originalName}`);

    return {
      stream: fileContent,
      fileName: mediaFile.originalName,
      mimeType: mediaFile.mimeType,
      fileSize: mediaFile.fileSize,
    };
  }

  // ---------------------------------------------------------------------------
  // LIST DOWNLOADS BY LEAD
  // ---------------------------------------------------------------------------
  async getDownloadsByLead(leadId: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundException(`Lead ${leadId} not found`);

    return this.prisma.conversion.findMany({
      where: { leadId, destination: 'DIGITAL_DOWNLOAD' },
      orderBy: { createdAt: 'desc' },
      include: { lead: { include: { contact: true } } },
    });
  }
}

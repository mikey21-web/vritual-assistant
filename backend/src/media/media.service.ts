import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { SignedUrlService } from '../shared/signed-url.service';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuid } from 'uuid';

const MAGIC_BYTES: Record<string, number[]> = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
  'application/pdf': [0x25, 0x50, 0x44, 0x46],
};

function sniffMime(buffer: Buffer): string | null {
  for (const [mime, bytes] of Object.entries(MAGIC_BYTES)) {
    if (buffer.length >= bytes.length && bytes.every((b, i) => buffer[i] === b)) {
      return mime;
    }
  }
  return null;
}

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'];
const EXECUTABLE_EXTENSIONS = ['exe', 'bat', 'sh', 'cmd', 'msi', 'vbs', 'ps1'];
const BLOCKED_MIMES = ['application/x-msdownload', 'application/x-msdos-program', 'application/x-sh', 'application/x-bat'];
const MAX_FILE_SIZE = 50 * 1024 * 1024;

@Injectable()
export class MediaService {
  constructor(private prisma: PrismaService, private config: ConfigService, private auditLogs: AuditLogsService, private signedUrl: SignedUrlService) {}

  async findAll(query: any = {}) {
    const { category, fileType, search, page = 1, limit = 20 } = query;
    const where: any = {};
    if (category) where.category = category;
    if (fileType) where.fileType = fileType;
    if (search) where.originalName = { contains: search, mode: 'insensitive' };
    const [data, total] = await Promise.all([
      this.prisma.mediaFile.findMany({ where, skip: (+page - 1) * +limit, take: +limit, orderBy: { createdAt: 'desc' }, include: { uploadedBy: { select: { id: true, name: true } } } }),
      this.prisma.mediaFile.count({ where }),
    ]);
    return { data, meta: { total, page: +page, limit: +limit } };
  }

  async findOne(id: string) { const f = await this.prisma.mediaFile.findUnique({ where: { id } }); if (!f) throw new NotFoundException('Media not found'); return f; }

  async upload(file: Express.Multer.File, userId: string, metadata: any = {}) {
    const ext = file.originalname.split('.').pop()?.toLowerCase() || '';
    if (EXECUTABLE_EXTENSIONS.includes(ext)) throw new BadRequestException('Executable files are not allowed');
    if (BLOCKED_MIMES.includes(file.mimetype)) throw new BadRequestException('Executable files are not allowed');
    if (file.size > MAX_FILE_SIZE) throw new BadRequestException('File too large');

    const sniffed = sniffMime(file.buffer);
    if (sniffed && !ALLOWED_MIMES.includes(sniffed)) {
      throw new BadRequestException(`File content appears to be ${sniffed} which is not allowed`);
    }
    if (!sniffed && !ALLOWED_MIMES.includes(file.mimetype)) {
      throw new BadRequestException(`MIME type ${file.mimetype} is not allowed`);
    }

    const isPrivate = metadata.private === true || metadata.private === 'true';
    const storageKey = `${uuid()}.${ext}`;
    const storagePath = this.config.get<string>('STORAGE_PATH', './uploads');
    const fullPath = path.join(storagePath, storageKey);
    if (!fs.existsSync(storagePath)) fs.mkdirSync(storagePath, { recursive: true });
    fs.writeFileSync(fullPath, file.buffer);

    const media = await this.prisma.mediaFile.create({
      data: {
        fileName: file.originalname, originalName: file.originalname, fileType: ext, mimeType: file.mimetype, fileSize: file.size,
        storageProvider: this.config.get<string>('STORAGE_PROVIDER', 'local'), storageKey,
        publicUrl: isPrivate ? null : `/uploads/${storageKey}`,
        category: metadata.category || 'OTHER', tags: metadata.tags || [], uploadedById: userId,
      },
    });
    await this.auditLogs.log('media_uploaded', 'MediaFile', media.id, userId);
    return media;
  }

  async update(id: string, data: any, userId?: string) { await this.findOne(id); const m = await this.prisma.mediaFile.update({ where: { id }, data }); await this.auditLogs.log('media_updated', 'MediaFile', id, userId); return m; }

  async remove(id: string, userId?: string) {
    const file = await this.findOne(id);
    if (file.storageProvider === 'local') {
      const fullPath = path.join(this.config.get<string>('STORAGE_PATH', './uploads'), file.storageKey);
      try { fs.unlinkSync(fullPath); } catch {}
    }
    await this.prisma.mediaFile.delete({ where: { id } });
    await this.auditLogs.log('media_deleted', 'MediaFile', id, userId);
    return { deleted: true };
  }

  async attach(id: string, target: { leadId?: string; campaignId?: string; templateId?: string }, userId?: string) {
    await this.findOne(id); let m;
    if (target.leadId) m = await this.prisma.mediaFile.update({ where: { id }, data: { leadId: target.leadId } });
    else if (target.campaignId) m = await this.prisma.mediaFile.update({ where: { id }, data: { campaignId: target.campaignId } });
    else if (target.templateId) m = await this.prisma.mediaFile.update({ where: { id }, data: { templateId: target.templateId } });
    else m = await this.findOne(id);
    await this.auditLogs.log('media_attached', 'MediaFile', id, userId, target);
    return m;
  }

  async detach(id: string, userId?: string) { await this.findOne(id); const m = await this.prisma.mediaFile.update({ where: { id }, data: { leadId: null, campaignId: null, templateId: null } }); await this.auditLogs.log('media_detached', 'MediaFile', id, userId); return m; }

  async getDownloadUrl(id: string, userId?: string) {
    const file = await this.findOne(id);
    if (!file.publicUrl) {
      const signed = this.signedUrl.sign(`/media/${id}/file/${file.storageKey}`, 3600);
      return { data: { url: signed, fileName: file.originalName, mimeType: file.mimeType, signed: true } };
    }
    await this.auditLogs.log('media_downloaded', 'MediaFile', id, userId);
    return { data: { url: file.publicUrl, fileName: file.originalName, mimeType: file.mimeType } };
  }

  getByLead(leadId: string) { return this.prisma.mediaFile.findMany({ where: { leadId } }); }
  getByCampaign(campaignId: string) { return this.prisma.mediaFile.findMany({ where: { campaignId } }); }
  getByTemplate(templateId: string) { return this.prisma.mediaFile.findMany({ where: { templateId } }); }

  async attachToLead(leadId: string, mediaId: string, userId?: string) { return this.attach(mediaId, { leadId }, userId); }
  async attachToCampaign(campaignId: string, mediaId: string, userId?: string) { return this.attach(mediaId, { campaignId }, userId); }
  async attachToTemplate(templateId: string, mediaId: string, userId?: string) { return this.attach(mediaId, { templateId }, userId); }
}

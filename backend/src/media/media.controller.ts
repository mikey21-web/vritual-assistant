import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req, UseInterceptors, UploadedFile, Res, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';
import { MediaService } from './media.service';
import { SignedUrlService } from '../shared/signed-url.service';
import { UpdateMediaDto, AttachMediaDto, MediaQueryDto } from './dto/media.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';

@ApiTags('Media')
@Controller('media')
export class MediaController {
  constructor(private service: MediaService, private signedUrl: SignedUrlService) {}

  @Get() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER') @ApiBearerAuth()
  findAll(@Query() q: MediaQueryDto) { return this.service.findAll(q); }

  @Post('upload') @ApiConsumes('multipart/form-data') @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles('OWNER', 'ADMIN', 'MANAGER') @ApiBearerAuth()
  upload(@UploadedFile() file: Express.Multer.File, @Req() req, @Body() body: Record<string, unknown>) { return this.service.upload(file, req.user.sub, body); }

  @Public()
  @Get('upload') onUploadGet() { return { error: 'Use POST /media/upload' }; }

  @Public()
  @Get(':id/file/:fileKey') serveSignedFile(@Param('id') id: string, @Param('fileKey') fileKey: string, @Query() q: Record<string, string>, @Res() res: Response) {
    if (!this.signedUrl.verify(`/media/${id}/file/${fileKey}`, q)) throw new BadRequestException('Invalid or expired signed URL');

    if (!/^[a-zA-Z0-9_.-]+$/.test(fileKey)) throw new BadRequestException('Invalid file key');

    const storagePath = path.resolve(process.env.STORAGE_PATH || './uploads');
    const fullPath = path.resolve(storagePath, fileKey);
    if (!fullPath.startsWith(storagePath + path.sep) && fullPath !== storagePath) {
      throw new BadRequestException('Invalid file path');
    }
    if (!fs.existsSync(fullPath)) throw new BadRequestException('File not found');
    res.setHeader('Content-Disposition', 'attachment');
    return res.sendFile(fullPath);
  }

  @Get(':id') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER') @ApiBearerAuth()
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Patch(':id') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('OWNER', 'ADMIN', 'MANAGER') @ApiBearerAuth()
  update(@Param('id') id: string, @Body() d: UpdateMediaDto, @Req() req) { return this.service.update(id, d, req.user.sub); }

  @Delete(':id') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('OWNER', 'ADMIN') @ApiBearerAuth()
  remove(@Param('id') id: string, @Req() req) { return this.service.remove(id, req.user.sub); }

  @Post(':id/attach') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('OWNER', 'ADMIN', 'MANAGER') @ApiBearerAuth()
  attach(@Param('id') id: string, @Body() d: AttachMediaDto, @Req() req) { return this.service.attach(id, d, req.user.sub); }

  @Post(':id/detach') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('OWNER', 'ADMIN', 'MANAGER') @ApiBearerAuth()
  detach(@Param('id') id: string, @Req() req) { return this.service.detach(id, req.user.sub); }

  @Get(':id/download-url') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT') @ApiBearerAuth()
  downloadUrl(@Param('id') id: string, @Req() req) { return this.service.getDownloadUrl(id, req.user.sub); }
}

@ApiTags('Media') @Controller('leads/:leadId/media') @UseGuards(JwtAuthGuard, RolesGuard) @ApiBearerAuth()
export class LeadMediaController {
  constructor(private service: MediaService) {}
  @Get() @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER') listMedia(@Param('leadId') leadId: string) { return this.service.getByLead(leadId); }
  @Post() @Roles('OWNER', 'ADMIN', 'MANAGER') attachMedia(@Param('leadId') leadId: string, @Body('mediaId') mediaId: string, @Req() req) { return this.service.attachToLead(leadId, mediaId, req.user.sub); }
}

@ApiTags('Media') @Controller('campaigns/:campaignId/media') @UseGuards(JwtAuthGuard, RolesGuard) @ApiBearerAuth()
export class CampaignMediaController {
  constructor(private service: MediaService) {}
  @Get() @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER') listMedia(@Param('campaignId') campaignId: string) { return this.service.getByCampaign(campaignId); }
  @Post() @Roles('OWNER', 'ADMIN', 'MANAGER') attachMedia(@Param('campaignId') campaignId: string, @Body('mediaId') mediaId: string, @Req() req) { return this.service.attachToCampaign(campaignId, mediaId, req.user.sub); }
}

@ApiTags('Media') @Controller('message-templates/:templateId/media') @UseGuards(JwtAuthGuard, RolesGuard) @ApiBearerAuth()
export class TemplateMediaController {
  constructor(private service: MediaService) {}
  @Get() @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER') listMedia(@Param('templateId') templateId: string) { return this.service.getByTemplate(templateId); }
  @Post() @Roles('OWNER', 'ADMIN', 'MANAGER') attachMedia(@Param('templateId') templateId: string, @Body('mediaId') mediaId: string, @Req() req) { return this.service.attachToTemplate(templateId, mediaId, req.user.sub); }
}

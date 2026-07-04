import { Controller, Get, Post, Body, Param, Query, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';
import { DigitalDownloadService } from './digital-download.service';
import { CreateDownloadDto } from './dto/digital-download.dto';

@ApiTags('Digital Downloads')
@Controller('digital-downloads')
export class DigitalDownloadController {
  constructor(private service: DigitalDownloadService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a one-time download link for a media file' })
  create(@Body() dto: CreateDownloadDto) {
    return this.service.createDownloadLink(dto.mediaId, dto.leadId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get download record details' })
  @ApiParam({ name: 'id', description: 'Download (conversion) ID' })
  get(@Param('id') id: string) {
    return this.service.getDownload(id);
  }

  @Public()
  @Get(':id/download')
  @ApiOperation({ summary: 'Download the file using the access key' })
  @ApiParam({ name: 'id', description: 'Download (conversion) ID' })
  @ApiQuery({ name: 'accessKey', description: 'One-time access key for the download' })
  async download(@Param('id') id: string, @Query('accessKey') accessKey: string, @Res() res: Response) {
    const result = await this.service.downloadFile(id, accessKey);
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    res.setHeader('Content-Length', result.fileSize);
    return res.send(result.stream);
  }

  @Get('lead/:leadId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all downloads for a lead' })
  @ApiParam({ name: 'leadId', description: 'Lead ID' })
  getByLead(@Param('leadId') leadId: string) {
    return this.service.getDownloadsByLead(leadId);
  }
}

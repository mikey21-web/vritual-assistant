import { Controller, Get, Post, Delete, Body, Param, Query, Req, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';
import { AdvancedMarketingService } from './advanced-marketing.service';

@ApiTags('Advanced Marketing')
@Controller()
export class AdvancedMarketingController {
  constructor(private service: AdvancedMarketingService) {}

  @Public()
  @Get('landing-pages/public/:tenantId/:slug')
  getPublic(@Param('tenantId') tenantId: string, @Param('slug') slug: string) {
    return this.service.getPublicLandingPage(tenantId, slug);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Post('landing-pages')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  createPage(@Body() body: any, @Req() req: any) {
    return this.service.createLandingPage(req.user.tenantId, { ...body, createdById: req.user.id });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Get('landing-pages')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER')
  listPages(@Req() req: any, @Query('projectId') projectId?: string) {
    return this.service.listLandingPages(req.user.tenantId, projectId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Post('landing-pages/:id/publish')
  @Roles('OWNER', 'ADMIN')
  publishPage(@Param('id') id: string, @Req() req: any) {
    return this.service.publishLandingPage(req.user.tenantId, id, req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Post('audience-segments')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  createSegment(@Body() body: any, @Req() req: any) {
    return this.service.createSegment(req.user.tenantId, { ...body, createdById: req.user.id });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Get('audience-segments')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER')
  listSegments(@Req() req: any) {
    return this.service.listSegments(req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Get('audience-segments/:id/preview')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER')
  previewSegment(@Param('id') id: string, @Req() req: any) {
    return this.service.previewSegment(req.user.tenantId, id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Post('suppression-list')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  addSuppression(@Body() body: any, @Req() req: any) {
    return this.service.addSuppression(req.user.tenantId, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Get('suppression-list')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  listSuppressions(@Req() req: any, @Query('channel') channel?: string) {
    return this.service.listSuppressions(req.user.tenantId, channel);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Delete('suppression-list/:id')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  removeSuppression(@Param('id') id: string, @Req() req: any) {
    return this.service.removeSuppression(req.user.tenantId, id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Post('ad-spend')
  @Roles('OWNER', 'ADMIN')
  importSpend(@Body() body: any, @Req() req: any) {
    return this.service.importSpend(req.user.tenantId, { ...body, createdById: req.user.id });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Post('ad-spend/csv')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @Roles('OWNER', 'ADMIN')
  importSpendCsv(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    return this.service.importSpendCsv(req.user.tenantId, file, req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Get('ad-spend/report')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  spendReport(@Req() req: any, @Query('projectId') projectId?: string) {
    return this.service.getSpendReport(req.user.tenantId, projectId);
  }
}

import { Controller, Get, Post, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { DocumentSearchService } from './document-search.service';

@ApiTags('Document Search')
@Controller('document-search')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DocumentSearchController {
  constructor(private service: DocumentSearchService) {}

  @Post()
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  index(@Body() body: any, @Req() req: any) {
    return this.service.indexDocument(req.user.tenantId, body);
  }

  @Get('search')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER')
  search(@Query('q') q: string, @Query() query: any, @Req() req: any) {
    return this.service.search(req.user.tenantId, q, {
      sourceType: query.sourceType, leadId: query.leadId,
      projectId: query.projectId, unitId: query.unitId,
    });
  }

  @Get('by-entity/:sourceType')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER')
  byEntity(@Param('sourceType') sourceType: string, @Query('sourceId') sourceId: string, @Req() req: any) {
    return this.service.findByEntity(req.user.tenantId, sourceType, sourceId);
  }

  @Post('rebuild')
  @Roles('OWNER', 'ADMIN')
  rebuild(@Req() req: any) {
    return this.service.rebuildIndex(req.user.tenantId);
  }

  @Get('stats')
  @Roles('OWNER', 'ADMIN', 'VIEWER')
  stats(@Req() req: any) {
    return this.service.getStorageStats(req.user.tenantId);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  delete(@Param('id') id: string, @Req() req: any) {
    return this.service.deleteDocument(req.user.tenantId, id);
  }
}

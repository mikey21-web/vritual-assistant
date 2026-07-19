import { Controller, Get, Post, Body, Param, Query, UseGuards, Req, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CostSheetsService } from './cost-sheets.service';
import { CreateCostSheetDto } from './dto/create-cost-sheet.dto';

@ApiTags('Cost Sheets')
@Controller('cost-sheets')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CostSheetsController {
  constructor(private service: CostSheetsService) {}

  @Get()
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER', 'SALES_AGENT')
  findAll(@Query() q: any, @Req() req: any) {
    return this.service.findAll(req.user.tenantId, q);
  }

  @Get(':id')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER', 'SALES_AGENT')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.service.findOne(req.user.tenantId, id);
  }

  @Post()
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  create(@Body() dto: CreateCostSheetDto, @Req() req: any) {
    return this.service.create({
      tenantId: req.user.tenantId,
      leadId: dto.leadId,
      unitId: dto.unitId,
      projectId: dto.projectId,
      createdById: req.user.id,
      lineItems: dto.lineItems,
    });
  }

  @Post(':id/line-items')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  replaceLineItems(@Param('id') id: string, @Body('lineItems') lineItems: any[], @Req() req: any) {
    return this.service.replaceLineItems(req.user.tenantId, id, lineItems, req.user.id);
  }

  @Post(':id/submit')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  submit(@Param('id') id: string, @Req() req: any) {
    return this.service.submit(req.user.tenantId, id, req.user.id);
  }

  @Post(':id/approve')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  approve(@Param('id') id: string, @Req() req: any) {
    return this.service.approve(req.user.tenantId, id, req.user.id);
  }

  @Post(':id/send')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  send(@Param('id') id: string, @Req() req: any) {
    return this.service.send(req.user.tenantId, id, req.user.id);
  }

  @Get(':id/compare/:otherId')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER')
  compare(@Param('id') id: string, @Param('otherId') otherId: string, @Req() req: any) {
    return this.service.compareVersions(req.user.tenantId, id, otherId);
  }

  @Get(':id/print')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER')
  async print(@Param('id') id: string, @Req() req: any, @Res() res: any) {
    const html = await this.service.generatePrintHtml(req.user.tenantId, id);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }
}

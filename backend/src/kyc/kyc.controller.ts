import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { KycService } from './kyc.service';
import { RequestBuyerDocumentDto, UploadBuyerDocumentDto, RejectBuyerDocumentDto } from './dto/kyc.dto';

@ApiTags('KYC')
@Controller('kyc')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class KycController {
  constructor(private service: KycService) {}

  @Get('documents')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER', 'SALES_AGENT', 'SUPPORT_AGENT')
  findAll(@Query() q: any, @Req() req: any) {
    return this.service.findAll(req.user.tenantId, q);
  }

  @Get('documents/:id')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER', 'SALES_AGENT', 'SUPPORT_AGENT')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.service.findOne(req.user.tenantId, id);
  }

  @Get('leads/:leadId/missing')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT')
  findMissing(@Param('leadId') leadId: string, @Req() req: any) {
    return this.service.findMissing(req.user.tenantId, leadId);
  }

  @Post('documents')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT')
  request(@Body() dto: RequestBuyerDocumentDto, @Req() req: any) {
    return this.service.request(req.user.tenantId, { ...dto, requestedById: req.user.id });
  }

  @Post('documents/:id/upload')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT')
  upload(@Param('id') id: string, @Body() dto: UploadBuyerDocumentDto, @Req() req: any) {
    return this.service.upload(req.user.tenantId, id, dto);
  }

  @Post('documents/:id/verify')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SUPPORT_AGENT')
  verify(@Param('id') id: string, @Req() req: any) {
    return this.service.verify(req.user.tenantId, id, req.user.id);
  }

  @Post('documents/:id/reject')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SUPPORT_AGENT')
  reject(@Param('id') id: string, @Body() dto: RejectBuyerDocumentDto, @Req() req: any) {
    return this.service.reject(req.user.tenantId, id, dto.reason, req.user.id);
  }

  @Post('documents/:id/waive')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  waive(@Param('id') id: string, @Body('reason') reason: string, @Req() req: any) {
    return this.service.waive(req.user.tenantId, id, reason, req.user.id);
  }
}

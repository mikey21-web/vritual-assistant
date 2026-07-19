import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { DocumentsService } from './documents.service';
import { ESignService } from './esign.service';
import { CreateDocumentTemplateDto, GenerateDocumentDto, GenerateDemandLetterDto } from './dto/documents.dto';
import { CreateESignRequestDto } from './dto/esign.dto';

@ApiTags('Documents')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DocumentsController {
  constructor(
    private service: DocumentsService,
    private esign: ESignService,
  ) {}

  @Get('document-templates')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  findTemplates(@Query() q: any, @Req() req: any) {
    return this.service.findTemplates(req.user.tenantId, q);
  }

  @Post('document-templates')
  @Roles('OWNER', 'ADMIN')
  createTemplate(@Body() dto: CreateDocumentTemplateDto, @Req() req: any) {
    return this.service.createTemplate(req.user.tenantId, dto);
  }

  @Post('document-templates/:id/approve')
  @Roles('OWNER', 'ADMIN')
  approveTemplate(@Param('id') id: string, @Req() req: any) {
    return this.service.approveTemplate(req.user.tenantId, id, req.user.id);
  }

  @Post('document-templates/:id/retire')
  @Roles('OWNER', 'ADMIN')
  retireTemplate(@Param('id') id: string, @Req() req: any) {
    return this.service.retireTemplate(req.user.tenantId, id);
  }

  @Get('generated-documents')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT')
  findGenerated(@Query() q: any, @Req() req: any) {
    return this.service.findGenerated(req.user.tenantId, q);
  }

  @Get('generated-documents/:id')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT')
  findOneGenerated(@Param('id') id: string, @Req() req: any) {
    return this.service.findOneGenerated(req.user.tenantId, id);
  }

  @Post('generated-documents')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT')
  generate(@Body() dto: GenerateDocumentDto, @Req() req: any) {
    return this.service.generate(req.user.tenantId, { ...dto, generatedById: req.user.id });
  }

  @Post('demand-letters')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SUPPORT_AGENT')
  generateDemandLetter(@Body() dto: GenerateDemandLetterDto, @Req() req: any) {
    return this.service.generateDemandLetter(req.user.tenantId, dto.paymentScheduleId, req.user.id);
  }

  @Post('booking-documents')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SUPPORT_AGENT')
  generateBookingDocument(@Body() dto: { documentType: string; bookingId: string; extraVariables?: Record<string, string> }, @Req() req: any) {
    return this.service.generateFromBooking(req.user.tenantId, { ...dto, generatedById: req.user.id });
  }

  @Get('esign-requests')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT')
  findEsign(@Query() q: any, @Req() req: any) {
    return this.esign.findAll(req.user.tenantId, q);
  }

  @Post('esign-requests')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SUPPORT_AGENT')
  createEsign(@Body() dto: CreateESignRequestDto, @Req() req: any) {
    return this.esign.createRequest(req.user.tenantId, dto);
  }

  @Post('esign-requests/:id/send')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SUPPORT_AGENT')
  sendEsign(@Param('id') id: string, @Req() req: any) {
    return this.esign.markSent(req.user.tenantId, id, req.user.id);
  }

  @Post('esign-requests/:id/record-manual-signed')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SUPPORT_AGENT')
  recordManualSigned(@Param('id') id: string, @Body('evidenceNote') evidenceNote: string, @Req() req: any) {
    return this.esign.recordManualSigned(req.user.tenantId, id, req.user.id, evidenceNote);
  }

  @Post('esign-requests/:id/reject')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SUPPORT_AGENT')
  rejectEsign(@Param('id') id: string, @Body('reason') reason: string, @Req() req: any) {
    return this.esign.markRejected(req.user.tenantId, id, reason, req.user.id);
  }
}

import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ComplianceService } from './compliance.service';

@ApiTags('Compliance')
@Controller('compliance')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ComplianceController {
  constructor(private service: ComplianceService) {}

  @Get('export/:contactId') @Roles('OWNER', 'ADMIN')
  exportData(@Param('contactId') contactId: string) {
    return this.service.exportData(contactId);
  }

  @Post('erase/:contactId') @Roles('OWNER', 'ADMIN')
  eraseData(@Param('contactId') contactId: string) {
    return this.service.eraseData(contactId);
  }

  @Get('report') @Roles('OWNER', 'ADMIN')
  complianceReport() {
    return this.service.complianceReport();
  }
}

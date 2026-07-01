import { Controller, Get, Post, Delete, Param, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { GdprService } from './gdpr.service';

@ApiTags('GDPR')
@Controller('gdpr')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class GdprController {
  constructor(private gdpr: GdprService) {}

  @Get('export/my-data')
  @ApiOperation({ summary: 'Export all data for the current user (right to data portability)' })
  exportMyData(@Req() req: any) {
    return this.gdpr.exportAllData(req.user.sub);
  }

  @Get('export/contact/:id')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Export all data for a specific contact' })
  exportContact(@Param('id') id: string) {
    return this.gdpr.exportContactData(id);
  }

  @Delete('contact/:id')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Permanently delete contact and all associated data (right to erasure)' })
  deleteContact(@Param('id') id: string) {
    return this.gdpr.hardDeleteContact(id);
  }
}

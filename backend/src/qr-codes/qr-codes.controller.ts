import { Controller, Get, Post, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';
import { QrCodesService } from './qr-codes.service';
import { CreateQrCodeDto } from '../shared/dto/misc.dto';
import { UpdateQrCodeDto, RecordQrScanDto } from './dto/qr-code.dto';

@ApiTags('QR Codes')
@Controller('qr-codes')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class QrCodesController {
  constructor(private service: QrCodesService) {}

  @Get() @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER') findAll() { return this.service.findAll(); }
  @Post() @Roles('OWNER', 'ADMIN', 'MANAGER') create(@Body() d: CreateQrCodeDto) { return this.service.create(d); }
  @Get(':id') @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Patch(':id') @Roles('OWNER', 'ADMIN', 'MANAGER') update(@Param('id') id: string, @Body() d: UpdateQrCodeDto) { return this.service.update(id, d); }
  @Get(':id/image') @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER') generateImage(@Param('id') id: string) { return this.service.generateImage(id); }
  @Public()
  @Post(':id/scan') recordScan(@Param('id') id: string, @Body() meta: RecordQrScanDto) { return this.service.recordScan(id, meta); }
}

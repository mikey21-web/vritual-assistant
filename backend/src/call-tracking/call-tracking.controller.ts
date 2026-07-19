import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards, UseInterceptors, UploadedFile, Req, HttpCode } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';
import { CallTrackingService } from './call-tracking.service';
import { DeviceAuthGuard } from './device-auth.guard';
import { GeneratePairingCodeDto, PairDeviceDto, CallSyncDto, AnalyticsQueryDto, SyncLogsQueryDto, UpdateNotesDto, UpdateDispositionDto } from './dto/call-tracking.dto';

@ApiTags('Call Tracking')
@Controller('call-tracking')
export class CallTrackingController {
  constructor(private service: CallTrackingService) {}

  // ─── Dashboard-authenticated: pairing initiation + device management ──

  @Post('devices/pair-code')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate a short-lived pairing code/QR payload for a new device' })
  generatePairingCode(@Body() d: GeneratePairingCodeDto, @Req() req) {
    return this.service.generatePairingCode(req.user.sub, d.name, req);
  }

  @Get('devices')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List paired devices for this tenant' })
  listDevices(@Req() req) {
    return this.service.listDevices(req);
  }

  @Delete('devices/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke a paired device' })
  revokeDevice(@Param('id') id: string, @Req() req) {
    return this.service.revokeDevice(id, req);
  }

  // ─── Phone-authenticated: pairing completion, no user JWT available ───

  @Public()
  @Post('devices/pair')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Complete device pairing using a short-lived code (called from the phone)' })
  pairDevice(@Body() d: PairDeviceDto) {
    return this.service.pairDevice(d.pairingCode, d.model, d.platform);
  }

  // ─── Device-authenticated (x-api-key): sync from the phone ────────────

  @Public()
  @UseGuards(DeviceAuthGuard)
  @Post('sync')
  @HttpCode(200)
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Sync a batch of call logs from a paired device' })
  sync(@Body() d: CallSyncDto, @Req() req) {
    return this.service.syncCalls(req.device, d);
  }

  @Public()
  @UseGuards(DeviceAuthGuard)
  @Post('recordings/:callLogId')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Upload a recorded call audio file for a synced call log' })
  uploadRecording(@Param('callLogId') callLogId: string, @UploadedFile() file: Express.Multer.File, @Req() req) {
    return this.service.attachRecording(req.device, callLogId, file);
  }

  // ─── Dashboard-authenticated: read call log + stats ────────────────────

  @Get('calls')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT', 'VIEWER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List synced call logs' })
  findAll(@Query() q: Record<string, unknown>, @Req() req) {
    return this.service.findAll(q, req);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT', 'VIEWER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Call tracking summary stats (today)' })
  stats(@Req() req) {
    return this.service.stats(req);
  }

  // ─── Analytics ──────────────────────────────────────────────────────────

  @Get('analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT', 'VIEWER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Call analytics over a date range (7d/30d/90d)' })
  analytics(@Query() q: AnalyticsQueryDto, @Req() req) {
    return this.service.analytics(q.range || '7d', req);
  }

  // ─── Sync Logs ─────────────────────────────────────────────────────────

  @Get('sync-logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT', 'VIEWER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List sync logs (CRM pushes, webhook deliveries) with pagination' })
  syncLogs(@Query() q: SyncLogsQueryDto, @Req() req) {
    return this.service.syncLogs(q, req);
  }

  @Post('sync-logs/:id/retry')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retry a failed sync (CRM/webhook push)' })
  retrySync(@Param('id') id: string, @Req() req) {
    return this.service.retrySync(id, req);
  }

  // ─── Post-Call Notes ────────────────────────────────────────────────────

  @Patch('calls/:id/notes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update post-call notes on a call log' })
  updateNotes(@Param('id') id: string, @Body() d: UpdateNotesDto, @Req() req) {
    return this.service.updateNotes(id, d.notes, req);
  }

  @Patch('calls/:id/disposition')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Record a call outcome/disposition, optionally scheduling a follow-up' })
  updateDisposition(@Param('id') id: string, @Body() d: UpdateDispositionDto, @Req() req) {
    return this.service.updateDisposition(id, d.disposition, d.nextActionAt, req);
  }

  // ─── Recording Retention ─────────────────────────────────────────────────

  @Get('recording-retention')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get recording retention days setting' })
  async getRecordingRetention(@Req() req) {
    return this.service.getRecordingRetention(req);
  }

  @Put('recording-retention')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set recording retention days (null = keep forever)' })
  async setRecordingRetention(@Body('days') days: number | null, @Req() req) {
    return this.service.setRecordingRetention(days, req);
  }
}

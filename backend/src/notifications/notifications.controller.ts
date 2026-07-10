import { Controller, Get, Patch, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private service: NotificationsService) {}

  @Get()
  findAll(@Req() req, @Query('unreadOnly') unreadOnly?: string) {
    return this.service.findForUser(req.user.sub, { unreadOnly: unreadOnly === 'true' });
  }

  @Get('unread-count')
  unreadCount(@Req() req) {
    return this.service.unreadCount(req.user.sub);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @Req() req) {
    return this.service.markRead(id, req.user.sub);
  }

  @Patch('read-all')
  markAllRead(@Req() req) {
    return this.service.markAllRead(req.user.sub);
  }
}

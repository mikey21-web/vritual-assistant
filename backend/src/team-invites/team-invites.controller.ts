import { Controller, Post, Get, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';
import { TeamInvitesService } from './team-invites.service';
import { CreateTeamInviteDto, AcceptTeamInviteDto } from './dto/team-invite.dto';

@ApiTags('Team Invites')
@Controller('team/invites')
export class TeamInvitesController {
  constructor(private service: TeamInvitesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invite a teammate — sends an email with a link for them to set their own password' })
  create(@Body() dto: CreateTeamInviteDto, @Req() req: any) {
    return this.service.create(dto, req);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List pending invites (for the Members & access table)' })
  list(@Req() req: any) {
    return this.service.list(req);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke a pending invite' })
  revoke(@Param('id') id: string) {
    return this.service.revoke(id);
  }

  @Post(':id/resend')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Regenerate the token and resend the invite email' })
  resend(@Param('id') id: string) {
    return this.service.resend(id);
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Get(':token/lookup')
  @ApiOperation({ summary: 'Public — prefill the accept-invite page from the token' })
  lookup(@Param('token') token: string) {
    return this.service.getByToken(token);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('accept')
  @ApiOperation({ summary: 'Public — invitee sets their own password and the account is created' })
  accept(@Body() dto: AcceptTeamInviteDto) {
    return this.service.accept(dto.token, dto.password);
  }
}

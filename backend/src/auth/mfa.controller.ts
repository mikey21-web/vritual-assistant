import { Controller, Post, Get, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { MfaService } from './mfa.service';
import { MfaSetupDto } from './dto/mfa-setup.dto';
import { Public } from './public.decorator';

@ApiTags('MFA')
@Controller('auth/mfa')
export class MfaController {
  constructor(private mfa: MfaService) {}

  @Get('setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate MFA secret and QR code URI' })
  setup(@Req() req: any) {
    return this.mfa.generateMfaToken(req.user.sub);
  }

  @Post('verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify TOTP code and enable MFA' })
  verify(@Req() req: any, @Body() dto: MfaSetupDto) {
    return this.mfa.verifyAndEnable(req.user.sub, dto.token);
  }

  @Post('disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable MFA' })
  disable(@Req() req: any, @Body() dto: MfaSetupDto) {
    return this.mfa.disable(req.user.sub, dto.token);
  }
}

import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { MemberRegistrationService } from './member-registration.service';
import { RegisterMemberDto } from './dto/member-registration.dto';

@ApiTags('Member Registration')
@Controller('member-registrations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MemberRegistrationController {
  constructor(private service: MemberRegistrationService) {}

  @Post()
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  @ApiOperation({ summary: 'Register a new member from a lead' })
  register(@Body() dto: RegisterMemberDto) {
    return this.service.registerMember(dto.leadId, {
      email: dto.email,
      name: dto.name,
      phone: dto.phone,
      preferences: dto.preferences,
    });
  }

  @Get(':id')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER')
  @ApiOperation({ summary: 'Get registration details' })
  @ApiParam({ name: 'id', description: 'Registration (conversion) ID' })
  get(@Param('id') id: string) {
    return this.service.getRegistration(id);
  }

  @Post(':id/complete')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Complete a member registration and send welcome message' })
  @ApiParam({ name: 'id', description: 'Registration (conversion) ID' })
  complete(@Param('id') id: string) {
    return this.service.completeRegistration(id);
  }
}

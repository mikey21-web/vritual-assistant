import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PostSalesService } from './post-sales.service';
import { AdvanceStageDto } from './dto/post-sales.dto';

@ApiTags('Post-Sales Lifecycle')
@Controller('bookings/:bookingId/post-sales')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PostSalesController {
  constructor(private service: PostSalesService) {}

  @Get('stage')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT', 'VIEWER')
  getStage(@Param('bookingId') bookingId: string, @Req() req: any) {
    return this.service.getCurrentStage(req.user.tenantId, bookingId);
  }

  @Get('history')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT', 'VIEWER')
  getHistory(@Param('bookingId') bookingId: string, @Req() req: any) {
    return this.service.getHistory(req.user.tenantId, bookingId);
  }

  @Post('advance')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SUPPORT_AGENT')
  advance(@Param('bookingId') bookingId: string, @Body() dto: AdvanceStageDto, @Req() req: any) {
    return this.service.advance(req.user.tenantId, bookingId, dto.toStage as any, req.user.id, dto.reason);
  }

  @Get('statement')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT', 'VIEWER')
  statement(@Param('bookingId') bookingId: string, @Req() req: any) {
    return this.service.getAccountStatement(req.user.tenantId, bookingId);
  }

  @Post('construction-update')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  constructionUpdate(@Param('bookingId') bookingId: string, @Body('message') message: string, @Body('imageUrl') imageUrl: string | undefined, @Req() req: any) {
    return this.service.addConstructionUpdate(req.user.tenantId, bookingId, message, imageUrl);
  }
}

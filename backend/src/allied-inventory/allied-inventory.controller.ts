import { Controller, Get, Post, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AlliedInventoryService } from './allied-inventory.service';

@ApiTags('Allied Inventory')
@Controller('allied-inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AlliedInventoryController {
  constructor(private service: AlliedInventoryService) {}

  @Post('phases')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  createPhase(@Body() body: any, @Req() req: any) {
    return this.service.createPhase(req.user.tenantId, body);
  }

  @Get('phases')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER')
  listPhases(@Req() req: any, @Query('projectId') projectId?: string) {
    return this.service.listPhases(req.user.tenantId, projectId);
  }

  @Post('items')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  createItem(@Body() body: any, @Req() req: any) {
    return this.service.createItem(req.user.tenantId, body);
  }

  @Get('items')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER')
  listItems(@Req() req: any, @Query() q: any) {
    return this.service.listItems(req.user.tenantId, q);
  }

  @Post('items/:id/allocate')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  allocate(@Param('id') id: string, @Body() body: { bookingId: string; pricePaidPaise?: string }, @Req() req: any) {
    return this.service.allocateItem(req.user.tenantId, id, body.bookingId, req.user.id, body.pricePaidPaise ? BigInt(body.pricePaidPaise) : undefined);
  }

  @Post('allocations/:id/release')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  release(@Param('id') id: string, @Req() req: any) {
    return this.service.releaseAllocation(req.user.tenantId, id, req.user.id);
  }

  @Post('release-batches')
  @Roles('OWNER', 'ADMIN')
  createBatch(@Body() body: any, @Req() req: any) {
    return this.service.createReleaseBatch(req.user.tenantId, { ...body, createdById: req.user.id });
  }

  @Get('release-batches')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER')
  listBatches(@Req() req: any, @Query('projectId') projectId?: string) {
    return this.service.listReleaseBatches(req.user.tenantId, projectId);
  }

  @Post('release-batches/:id/approve')
  @Roles('OWNER', 'ADMIN')
  approveBatch(@Param('id') id: string, @Req() req: any) {
    return this.service.approveReleaseBatch(req.user.tenantId, id, req.user.id);
  }
}

import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { InventoryService } from './inventory.service';
import { CreateInventoryItemDto, CreateStockMovementDto, CreateLocationDto, AllocateInventoryDto } from './dto/inventory.dto';
import { PaginationDto } from '../shared/dto/pagination.dto';

const WRITE_ROLES = ['OWNER', 'ADMIN', 'MANAGER'] as const;
const READ_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT'] as const;

@ApiTags('Inventory')
@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class InventoryController {
  constructor(private service: InventoryService) {}

  @Get('items') @Roles(...READ_ROLES) findItems(@Query() q: PaginationDto & { category?: string }) { return this.service.findItems(q); }
  @Get('items/stats') @Roles(...READ_ROLES) stats() { return this.service.stats(); }
  @Post('items') @Roles(...WRITE_ROLES) createItem(@Body() d: CreateInventoryItemDto) { return this.service.createItem(d); }

  @Get('movements') @Roles(...READ_ROLES) findMovements(@Query() q: PaginationDto & { itemId?: string }) { return this.service.findMovements(q); }
  @Post('movements') @Roles(...WRITE_ROLES) createMovement(@Body() d: CreateStockMovementDto) { return this.service.createMovement(d); }

  @Get('locations') @Roles(...READ_ROLES) findLocations(@Query('active') active?: string) { return this.service.findLocations({ active }); }
  @Post('locations') @Roles(...WRITE_ROLES) createLocation(@Body() d: CreateLocationDto) { return this.service.createLocation(d); }

  @Get('events/:eventId/allocations') @Roles(...READ_ROLES) listAllocations(@Param('eventId') eventId: string) { return this.service.listAllocations(eventId); }
  @Post('events/:eventId/allocations') @Roles(...WRITE_ROLES) allocate(@Param('eventId') eventId: string, @Body() d: AllocateInventoryDto) { return this.service.allocateToEvent(eventId, d); }
}

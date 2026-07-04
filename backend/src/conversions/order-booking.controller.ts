import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OrderBookingService } from './order-booking.service';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto/order-booking.dto';

@ApiTags('Order Booking')
@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class OrderBookingController {
  constructor(private service: OrderBookingService) {}

  @Post()
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  @ApiOperation({ summary: 'Create a new order for a lead' })
  create(@Body() dto: CreateOrderDto) {
    return this.service.createOrder(dto.leadId, {
      items: dto.items,
      notes: dto.notes,
    });
  }

  @Get(':id')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER')
  @ApiOperation({ summary: 'Get order details' })
  @ApiParam({ name: 'id', description: 'Order (conversion) ID' })
  get(@Param('id') id: string) {
    return this.service.getOrder(id);
  }

  @Patch(':id/status')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update order status' })
  @ApiParam({ name: 'id', description: 'Order (conversion) ID' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.service.updateOrderStatus(id, dto.status);
  }

  @Get('lead/:leadId')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER')
  @ApiOperation({ summary: 'List all orders for a lead' })
  @ApiParam({ name: 'leadId', description: 'Lead ID' })
  getByLead(@Param('leadId') leadId: string) {
    return this.service.getOrdersByLead(leadId);
  }
}

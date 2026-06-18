import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from '../shared/dto/misc.dto';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private service: UsersService) {}

  @Get() @Roles('OWNER', 'ADMIN', 'MANAGER') findAll() { return this.service.findAll(); }
  @Post() @Roles('OWNER', 'ADMIN') create(@Body() d: CreateUserDto) { return this.service.create(d); }
  @Get(':id') @Roles('OWNER', 'ADMIN', 'MANAGER') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Patch(':id') @Roles('OWNER', 'ADMIN') update(@Param('id') id: string, @Body() d: UpdateUserDto) { return this.service.update(id, d); }
  @Delete(':id') @Roles('OWNER') remove(@Param('id') id: string) { return this.service.remove(id); }
}

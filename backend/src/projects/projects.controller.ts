import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, UseInterceptors, UploadedFile, UploadedFiles, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto, CreateTowerDto, CreateUnitDto, UpdateUnitDto, BulkImportUnitsDto } from './dto/project.dto';

@ApiTags('Projects')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ProjectsController {
  constructor(private service: ProjectsService) {}

  // Projects
  @Get('projects') @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER')
  findAll(@Query() q: any, @Req() req: any) { return this.service.findAll({ ...q, tenantId: req.user?.tenantId }); }

  @Post('projects') @Roles('OWNER', 'ADMIN', 'MANAGER')
  create(@Body() dto: CreateProjectDto, @Req() req: any) { return this.service.create({ ...dto, tenantId: req.user?.tenantId }); }

  @Get('projects/:id') @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Patch('projects/:id') @Roles('OWNER', 'ADMIN', 'MANAGER')
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto) { return this.service.update(id, dto); }

  @Delete('projects/:id') @Roles('OWNER', 'ADMIN')
  remove(@Param('id') id: string) { return this.service.remove(id); }

  @Get('projects/:id/grid') @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER')
  grid(@Param('id') id: string) { return this.service.getAvailabilityGrid(id); }

  @Get('projects/:id/velocity') @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER')
  velocity(@Param('id') id: string) { return this.service.getVelocity(id); }

  @Post('projects/:id/images') @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('images', 10, { limits: { fileSize: 8 * 1024 * 1024 } }))
  addImages(@Param('id') id: string, @UploadedFiles() files: Express.Multer.File[]) {
    return this.service.addImages(id, files || []);
  }

  @Delete('projects/:id/images') @Roles('OWNER', 'ADMIN', 'MANAGER')
  removeImage(@Param('id') id: string, @Query('url') url: string) {
    return this.service.removeImage(id, url);
  }

  @Post('projects/:id/brochure') @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('brochure', { limits: { fileSize: 20 * 1024 * 1024 } }))
  setBrochure(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.service.setBrochure(id, file);
  }

  @Delete('projects/:id/brochure') @Roles('OWNER', 'ADMIN', 'MANAGER')
  removeBrochure(@Param('id') id: string) {
    return this.service.removeBrochure(id);
  }

  // Towers
  @Post('projects/:id/towers') @Roles('OWNER', 'ADMIN', 'MANAGER')
  createTower(@Param('id') projectId: string, @Body() dto: CreateTowerDto) { return this.service.createTower(projectId, dto); }

  @Patch('towers/:id') @Roles('OWNER', 'ADMIN', 'MANAGER')
  updateTower(@Param('id') id: string, @Body() dto: Partial<CreateTowerDto>) { return this.service.updateTower(id, dto); }

  @Delete('towers/:id') @Roles('OWNER', 'ADMIN')
  removeTower(@Param('id') id: string) { return this.service.removeTower(id); }

  // Units
  @Post('projects/:id/units') @Roles('OWNER', 'ADMIN', 'MANAGER')
  createUnit(@Param('id') projectId: string, @Body() dto: CreateUnitDto, @Req() req: any) {
    return this.service.createUnit(projectId, { ...dto, tenantId: req.user?.tenantId });
  }

  @Post('projects/:id/units/bulk-import') @Roles('OWNER', 'ADMIN', 'MANAGER')
  bulkImportUnits(@Param('id') projectId: string, @Body() dto: BulkImportUnitsDto) {
    return this.service.bulkImportUnits(projectId, dto.units);
  }

  @Get('units') @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER')
  findUnits(@Query() q: any, @Req() req: any) { return this.service.findUnits({ ...q, tenantId: req.user?.tenantId }); }

  @Get('units/:id') @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER')
  findUnit(@Param('id') id: string) { return this.service.findUnit(id); }

  @Patch('units/:id') @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  updateUnit(@Param('id') id: string, @Body() dto: UpdateUnitDto) { return this.service.updateUnit(id, dto); }

  @Delete('units/:id') @Roles('OWNER', 'ADMIN')
  removeUnit(@Param('id') id: string) { return this.service.removeUnit(id); }
}

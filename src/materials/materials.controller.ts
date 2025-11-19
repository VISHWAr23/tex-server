import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { MaterialsService } from './materials.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('materials')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Post()
  @Roles(Role.OWNER)
  create(@Body() body: any) {
    return this.materialsService.create(body);
  }

  @Get()
  @Roles(Role.OWNER, Role.WORKER)
  findAll() {
    return this.materialsService.findAll();
  }
}
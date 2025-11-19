import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { WorkService } from './work.service';
import { CreateWorkDto } from './dto/create-work.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('work')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkController {
  constructor(private readonly workService: WorkService) {}

  @Post()
  @Roles(Role.OWNER, Role.WORKER) // Both can log work? Adjust if only Owner logs.
  create(@Request() req, @Body() createWorkDto: CreateWorkDto) {
    return this.workService.create(req.user.userId, createWorkDto);
  }

  @Get()
  @Roles(Role.OWNER)
  findAll() {
    return this.workService.findAll();
  }

  @Get('my-work')
  @Roles(Role.WORKER)
  findMyWork(@Request() req) {
    return this.workService.findMyWork(req.user.userId);
  }
}
import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Post()
  @Roles(Role.OWNER)
  create(@Body() body: any) {
    return this.financeService.create(body);
  }

  @Get()
  @Roles(Role.OWNER)
  findAll() {
    return this.financeService.findAll();
  }
}
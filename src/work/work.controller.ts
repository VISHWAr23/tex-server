import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { WorkService } from './work.service';
import { CreateWorkDto } from './dto/create-work.dto';
import { UpdateWorkDto } from './dto/update-work.dto';
import { WorkQueryDto } from './dto/work-query.dto';
import { CreateDescriptionDto } from './dto/create-description.dto';

/**
 * Work Controller
 * Handles all work-related HTTP requests
 * Base path: /api/work
 */
@Controller('work')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkController {
  constructor(private workService: WorkService) {}

  // ==================== DESCRIPTIONS ====================

  /**
   * GET /api/work/descriptions
   * Get all work descriptions for dropdown
   */
  @Get('descriptions')
  async getAllDescriptions() {
    return this.workService.getAllDescriptions();
  }

  /**
   * POST /api/work/descriptions
   * Create a new work description
   */
  @Post('descriptions')
  async createDescription(@Body() dto: CreateDescriptionDto) {
    return this.workService.createDescription(dto);
  }

  // ==================== WORK RECORDS ====================

  /**
   * POST /api/work
   * Create a new work entry for the logged-in user
   */
  @Post()
  async createWork(@Request() req, @Body() dto: CreateWorkDto) {
    return this.workService.createWork(req.user.sub, dto);
  }

  /**
   * GET /api/work/my-work
   * Get own work history
   */
  @Get('my-work')
  async getMyWork(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.workService.getMyWork(req.user.sub, startDate, endDate);
  }

  /**
   * GET /api/work/statistics
   * Get work statistics (filtered by query params)
   */
  @Get('statistics')
  async getWorkStatistics(@Request() req, @Query() query: WorkQueryDto) {
    // If worker, only show their own stats
    if (req.user.role === 'WORKER') {
      query.userId = req.user.sub;
    }
    return this.workService.getWorkStatistics(query);
  }

  /**
   * GET /api/work/user/:userId/date/:date
   * Get work for specific user and date
   */
  @Get('user/:userId/date/:date')
  async getWorkByUserAndDate(
    @Request() req,
    @Param('userId', ParseIntPipe) userId: number,
    @Param('date') date: string,
  ) {
    // Workers can only see their own work
    if (req.user.role === 'WORKER' && req.user.sub !== userId) {
      userId = req.user.sub;
    }
    return this.workService.getWorkByUserAndDate(userId, date);
  }

  /**
   * GET /api/work/:id
   * Get work by ID
   */
  @Get(':id')
  async getWorkById(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.workService.getWorkById(id, req.user.sub, req.user.role);
  }

  /**
   * GET /api/work
   * Get all work records (Admin only)
   */
  @Get()
  @Roles('OWNER')
  async getAllWork(@Query() query: WorkQueryDto) {
    return this.workService.getAllWork(query);
  }

  /**
   * PUT /api/work/:id
   * Update work record
   */
  @Put(':id')
  async updateWork(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWorkDto,
  ) {
    return this.workService.updateWork(id, dto, req.user.sub, req.user.role);
  }

  /**
   * DELETE /api/work/:id
   * Delete work record
   */
  @Delete(':id')
  async deleteWork(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.workService.deleteWork(id, req.user.sub, req.user.role);
  }
}

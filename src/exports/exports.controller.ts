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
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import {
  CreateExportDto,
  UpdateExportDto,
  ExportQueryDto,
} from './dto/export.dto';
import { ExportsService } from './exports.service';

/**
 * Exports Controller
 * Handles export tracking and management
 * Uses shared WorkDescription model
 * Base path: /api/exports
 */
@Controller('exports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OWNER)
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  // ==================== WORK DESCRIPTIONS (SHARED) ====================

  /**
   * GET /api/exports/descriptions
   * Get all work descriptions (shared with Work module)
   */
  @Get('descriptions')
  async getAllDescriptions() {
    return this.exportsService.getAllDescriptions();
  }

  // ==================== EXPORT RECORDS ====================

  /**
   * POST /api/exports
   * Create a new export entry
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createExport(@Body() dto: CreateExportDto) {
    return this.exportsService.createExport(dto);
  }

  /**
   * GET /api/exports
   * Get all exports with optional filters
   */
  @Get()
  async getAllExports(@Query() query: ExportQueryDto) {
    return this.exportsService.getAllExports(query);
  }

  /**
   * GET /api/exports/statistics
   * Get export statistics
   */
  @Get('statistics')
  async getStatistics(@Query() query: ExportQueryDto) {
    return this.exportsService.getStatistics(query);
  }

  /**
   * GET /api/exports/companies
   * Get unique company names
   */
  @Get('companies')
  async getCompanies() {
    return this.exportsService.getCompanies();
  }

  /**
   * GET /api/exports/:id
   * Get export by ID
   */
  @Get(':id')
  async getExportById(@Param('id', ParseIntPipe) id: number) {
    return this.exportsService.getExportById(id);
  }

  /**
   * PUT /api/exports/:id
   * Update an export entry
   */
  @Put(':id')
  async updateExport(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateExportDto,
  ) {
    return this.exportsService.updateExport(id, dto);
  }

  /**
   * DELETE /api/exports/:id
   * Delete an export entry
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteExport(@Param('id', ParseIntPipe) id: number) {
    return this.exportsService.deleteExport(id);
  }
}

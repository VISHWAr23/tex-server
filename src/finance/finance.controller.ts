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
import { FinanceService } from './finance.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role, ExpenseType } from '@prisma/client';
import { CreateExpenseDto, UpdateExpenseDto, ExpenseQueryDto } from './dto/expense.dto';

/**
 * Finance Controller
 * Handles all expense-related HTTP requests
 * Base path: /api/finance
 */
@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OWNER)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  // ==================== COMPANY EXPENSES ====================

  /**
   * POST /api/finance/company
   * Create a company expense
   */
  @Post('company')
  @HttpCode(HttpStatus.CREATED)
  async createCompanyExpense(@Body() dto: CreateExpenseDto) {
    dto.type = ExpenseType.COMPANY;
    return this.financeService.create(dto);
  }

  /**
   * GET /api/finance/company
   * Get all company expenses
   */
  @Get('company')
  async getCompanyExpenses(@Query() query: ExpenseQueryDto) {
    return this.financeService.findAll(query, ExpenseType.COMPANY);
  }

  /**
   * GET /api/finance/company/statistics
   * Get company expense statistics
   */
  @Get('company/statistics')
  async getCompanyStatistics(@Query() query: ExpenseQueryDto) {
    return this.financeService.getStatistics(query, ExpenseType.COMPANY);
  }

  /**
   * GET /api/finance/company/categories
   * Get company expense categories
   */
  @Get('company/categories')
  async getCompanyCategories() {
    return this.financeService.getCategories(ExpenseType.COMPANY);
  }

  // ==================== HOME EXPENSES ====================

  /**
   * POST /api/finance/home
   * Create a home expense
   */
  @Post('home')
  @HttpCode(HttpStatus.CREATED)
  async createHomeExpense(@Body() dto: CreateExpenseDto) {
    dto.type = ExpenseType.HOME;
    return this.financeService.create(dto);
  }

  /**
   * GET /api/finance/home
   * Get all home expenses
   */
  @Get('home')
  async getHomeExpenses(@Query() query: ExpenseQueryDto) {
    return this.financeService.findAll(query, ExpenseType.HOME);
  }

  /**
   * GET /api/finance/home/statistics
   * Get home expense statistics
   */
  @Get('home/statistics')
  async getHomeStatistics(@Query() query: ExpenseQueryDto) {
    return this.financeService.getStatistics(query, ExpenseType.HOME);
  }

  /**
   * GET /api/finance/home/categories
   * Get home expense categories
   */
  @Get('home/categories')
  async getHomeCategories() {
    return this.financeService.getCategories(ExpenseType.HOME);
  }

  // ==================== GENERAL ENDPOINTS ====================

  /**
   * GET /api/finance
   * Get all expenses (both company and home)
   */
  @Get()
  async getAllExpenses(@Query() query: ExpenseQueryDto) {
    return this.financeService.findAll(query);
  }

  /**
   * GET /api/finance/statistics
   * Get overall statistics
   */
  @Get('statistics')
  async getStatistics(@Query() query: ExpenseQueryDto) {
    return this.financeService.getStatistics(query);
  }

  /**
   * GET /api/finance/categories
   * Get all unique categories
   */
  @Get('categories')
  async getCategories() {
    return this.financeService.getCategories();
  }

  /**
   * GET /api/finance/:id
   * Get expense by ID
   */
  @Get(':id')
  async getExpenseById(@Param('id', ParseIntPipe) id: number) {
    return this.financeService.findById(id);
  }

  /**
   * PUT /api/finance/:id
   * Update an expense
   */
  @Put(':id')
  async updateExpense(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.financeService.update(id, dto);
  }

  /**
   * DELETE /api/finance/:id
   * Delete an expense
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteExpense(@Param('id', ParseIntPipe) id: number) {
    return this.financeService.delete(id);
  }
}

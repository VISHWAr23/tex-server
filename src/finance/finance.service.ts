import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto, UpdateExpenseDto, ExpenseQueryDto } from './dto/expense.dto';
import { ExpenseType } from '@prisma/client';

/**
 * Finance Service
 * Handles all expense-related operations
 * Supports both COMPANY and HOME expense types
 */
@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new expense
   */
  async create(dto: CreateExpenseDto) {
    const data: any = {
      type: dto.type,
      category: dto.category,
      amount: dto.amount,
      note: dto.note || null,
    };

    if (dto.date) {
      data.date = new Date(dto.date);
    }

    return this.prisma.expense.create({ data });
  }

  /**
   * Get all expenses with optional filters
   */
  async findAll(query: ExpenseQueryDto, type?: ExpenseType) {
    const where: any = {};

    // Filter by type if specified
    if (type) {
      where.type = type;
    } else if (query.type) {
      where.type = query.type;
    }

    // Filter by category
    if (query.category) {
      where.category = { contains: query.category, mode: 'insensitive' };
    }

    // Filter by date range
    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) {
        where.date.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const endDate = new Date(query.endDate);
        endDate.setHours(23, 59, 59, 999);
        where.date.lte = endDate;
      }
    }

    const expenses = await this.prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    return expenses;
  }

  /**
   * Get expense by ID
   */
  async findById(id: number) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
    });

    if (!expense) {
      throw new NotFoundException(`Expense with ID ${id} not found`);
    }

    return expense;
  }

  /**
   * Update an expense
   */
  async update(id: number, dto: UpdateExpenseDto) {
    // Check if expense exists
    await this.findById(id);

    const data: any = {};

    if (dto.type !== undefined) data.type = dto.type;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.amount !== undefined) data.amount = dto.amount;
    if (dto.note !== undefined) data.note = dto.note;
    if (dto.date !== undefined) data.date = new Date(dto.date);

    return this.prisma.expense.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete an expense
   */
  async delete(id: number) {
    // Check if expense exists
    await this.findById(id);

    await this.prisma.expense.delete({
      where: { id },
    });

    return { message: 'Expense deleted successfully' };
  }

  /**
   * Get expense statistics
   */
  async getStatistics(query: ExpenseQueryDto, type?: ExpenseType) {
    const where: any = {};

    if (type) {
      where.type = type;
    } else if (query.type) {
      where.type = query.type;
    }

    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) {
        where.date.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const endDate = new Date(query.endDate);
        endDate.setHours(23, 59, 59, 999);
        where.date.lte = endDate;
      }
    }

    // Get total and count
    const aggregate = await this.prisma.expense.aggregate({
      where,
      _sum: { amount: true },
      _count: { id: true },
      _avg: { amount: true },
    });

    // Get by category
    const byCategory = await this.prisma.expense.groupBy({
      by: ['category'],
      where,
      _sum: { amount: true },
      _count: { id: true },
      orderBy: { _sum: { amount: 'desc' } },
    });

    // Get by type (if not filtered by type)
    const byType = type ? null : await this.prisma.expense.groupBy({
      by: ['type'],
      where,
      _sum: { amount: true },
      _count: { id: true },
    });

    // Get monthly breakdown
    const expenses = await this.prisma.expense.findMany({
      where,
      select: { date: true, amount: true },
      orderBy: { date: 'asc' },
    });

    const monthlyData: Record<string, number> = {};
    expenses.forEach((expense) => {
      const monthKey = expense.date.toISOString().substring(0, 7);
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + expense.amount;
    });

    const monthlyBreakdown = Object.entries(monthlyData).map(([month, total]) => ({
      month,
      total,
    }));

    return {
      summary: {
        totalAmount: aggregate._sum.amount || 0,
        totalRecords: aggregate._count.id || 0,
        averageAmount: aggregate._avg.amount || 0,
      },
      byCategory: byCategory.map((c) => ({
        category: c.category,
        total: c._sum.amount || 0,
        count: c._count.id || 0,
      })),
      byType,
      monthlyBreakdown,
    };
  }

  /**
   * Get unique categories
   */
  async getCategories(type?: ExpenseType) {
    const where = type ? { type } : {};

    const categories = await this.prisma.expense.findMany({
      where,
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });

    return categories.map((c) => c.category);
  }
}

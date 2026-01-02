import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkDto } from './dto/create-work.dto';
import { UpdateWorkDto } from './dto/update-work.dto';
import { WorkQueryDto } from './dto/work-query.dto';
import { CreateDescriptionDto } from './dto/create-description.dto';

/**
 * Work Service
 * Handles daily work tracking and description management
 * Follows international standards for date handling (ISO 8601)
 */
@Injectable()
export class WorkService {
  constructor(private prisma: PrismaService) {}

  // ==================== WORK DESCRIPTIONS ====================

  /**
   * Get all work descriptions for dropdown
   * Sorted alphabetically for easy selection
   */
  async getAllDescriptions() {
    return this.prisma.workDescription.findMany({
      orderBy: { text: 'asc' },
      select: {
        id: true,
        text: true,
        _count: {
          select: { works: true },
        },
      },
    });
  }

  /**
   * Create a new work description
   * If description already exists, return the existing one
   */
  async createDescription(dto: CreateDescriptionDto) {
    const existing = await this.prisma.workDescription.findUnique({
      where: { text: dto.text },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.workDescription.create({
      data: { text: dto.text },
    });
  }

  /**
   * Get or create description by text
   * Used when creating work entries
   */
  async getOrCreateDescription(text: string) {
    const existing = await this.prisma.workDescription.findUnique({
      where: { text },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.workDescription.create({
      data: { text },
    });
  }

  // ==================== WORK RECORDS ====================

  /**
   * Normalize date to start of day in UTC
   * Ensures consistent date storage following ISO 8601
   */
  private normalizeDate(dateStr: string): Date {
    const date = new Date(dateStr);
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }

  /**
   * Create a new work entry for a user
   * Allows multiple work entries per user per day
   * Automatically creates/updates attendance record for the day
   */
  async createWork(userId: number, dto: CreateWorkDto) {
    const normalizedDate = this.normalizeDate(dto.date);

    // Get or create description
    let descriptionId = dto.descriptionId;
    if (!descriptionId && dto.description) {
      const description = await this.getOrCreateDescription(dto.description);
      descriptionId = description.id;
    }

    if (!descriptionId) {
      throw new BadRequestException('Description is required');
    }

    // Calculate total amount
    const totalAmount = dto.quantity * dto.pricePerUnit;

    // Create work and attendance in a transaction
    return this.prisma.$transaction(async (tx) => {
      // Create work entry (multiple entries per day allowed)
      const work = await tx.work.create({
        data: {
          date: normalizedDate,
          quantity: dto.quantity,
          pricePerUnit: dto.pricePerUnit,
          totalAmount,
          descriptionId,
          userId,
        },
        include: {
          description: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Check if attendance already exists for this date and user
      const existingAttendance = await tx.attendance.findUnique({
        where: {
          date_userId: {
            date: normalizedDate,
            userId,
          },
        },
      });

      if (existingAttendance) {
        // Update existing attendance to mark as present
        await tx.attendance.update({
          where: { id: existingAttendance.id },
          data: {
            status: 'PRESENT',
          },
        });
      } else {
        // Create attendance record (auto-marked PRESENT since work was done)
        await tx.attendance.create({
          data: {
            date: normalizedDate,
            userId,
            workId: work.id,
            status: 'PRESENT',
          },
        });
      }

      return work;
    });
  }

  /**
   * Get work by ID
   */
  async getWorkById(id: number, userId?: number, role?: string) {
    const work = await this.prisma.work.findUnique({
      where: { id },
      include: {
        description: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        attendance: true,
      },
    });

    if (!work) {
      throw new NotFoundException(`Work record with ID ${id} not found`);
    }

    // Workers can only see their own work
    if (role === 'WORKER' && work.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return work;
  }

  /**
   * Get work entries for a specific user and date
   * Returns array since multiple entries per day are now allowed
   */
  async getWorkByUserAndDate(userId: number, date: string) {
    const normalizedDate = this.normalizeDate(date);

    const works = await this.prisma.work.findMany({
      where: {
        date: normalizedDate,
        userId,
      },
      include: {
        description: true,
        attendance: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return works;
  }

  /**
   * Get own work history for a worker
   */
  async getMyWork(userId: number, startDate?: string, endDate?: string) {
    const where: any = { userId };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = this.normalizeDate(startDate);
      }
      if (endDate) {
        where.date.lte = this.normalizeDate(endDate);
      }
    }

    return this.prisma.work.findMany({
      where,
      include: {
        description: true,
        attendance: true,
      },
      orderBy: { date: 'desc' },
    });
  }

  /**
   * Get all work records (Admin only)
   */
  async getAllWork(query: WorkQueryDto) {
    const where: any = {};

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) {
        where.date.gte = this.normalizeDate(query.startDate);
      }
      if (query.endDate) {
        where.date.lte = this.normalizeDate(query.endDate);
      }
    }

    return this.prisma.work.findMany({
      where,
      include: {
        description: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        attendance: true,
      },
      orderBy: [{ date: 'desc' }, { userId: 'asc' }],
    });
  }

  /**
   * Update work record
   */
  async updateWork(
    id: number,
    dto: UpdateWorkDto,
    userId: number,
    role: string,
  ) {
    const work = await this.prisma.work.findUnique({
      where: { id },
    });

    if (!work) {
      throw new NotFoundException(`Work record with ID ${id} not found`);
    }

    // Workers can only update their own work
    if (role === 'WORKER' && work.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Handle description update
    let descriptionId = dto.descriptionId;
    if (!descriptionId && dto.description) {
      const description = await this.getOrCreateDescription(dto.description);
      descriptionId = description.id;
    }

    // Calculate new total if quantity or price changed
    const quantity = dto.quantity ?? work.quantity;
    const pricePerUnit = dto.pricePerUnit ?? work.pricePerUnit;
    const totalAmount = quantity * pricePerUnit;

    const updateData: any = {
      quantity,
      pricePerUnit,
      totalAmount,
    };

    if (descriptionId) {
      updateData.descriptionId = descriptionId;
    }

    return this.prisma.work.update({
      where: { id },
      data: updateData,
      include: {
        description: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        attendance: true,
      },
    });
  }

  /**
   * Delete work record
   */
  async deleteWork(id: number, userId: number, role: string) {
    const work = await this.prisma.work.findUnique({
      where: { id },
      include: { attendance: true },
    });

    if (!work) {
      throw new NotFoundException(`Work record with ID ${id} not found`);
    }

    // Workers can only delete their own work
    if (role === 'WORKER' && work.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.$transaction(async (tx) => {
      // Update attendance to remove work reference
      if (work.attendance) {
        await tx.attendance.update({
          where: { id: work.attendance.id },
          data: {
            workId: null,
            status: 'ABSENT',
          },
        });
      }

      // Delete work
      return tx.work.delete({
        where: { id },
      });
    });
  }

  /**
   * Get work statistics
   */
  async getWorkStatistics(query: WorkQueryDto) {
    const where: any = {};

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) {
        where.date.gte = this.normalizeDate(query.startDate);
      }
      if (query.endDate) {
        where.date.lte = this.normalizeDate(query.endDate);
      }
    }

    const aggregation = await this.prisma.work.aggregate({
      where,
      _sum: {
        quantity: true,
        totalAmount: true,
      },
      _avg: {
        quantity: true,
        pricePerUnit: true,
        totalAmount: true,
      },
      _count: true,
      _max: {
        totalAmount: true,
        date: true,
      },
      _min: {
        totalAmount: true,
        date: true,
      },
    });

    // Get daily breakdown
    const dailyWork = await this.prisma.work.groupBy({
      by: ['date'],
      where,
      _sum: {
        totalAmount: true,
        quantity: true,
      },
      _count: true,
      orderBy: {
        date: 'desc',
      },
      take: 30, // Last 30 days with work
    });

    // Get worker breakdown (admin only)
    let workerBreakdown: Array<{
      userId: number;
      _sum: { totalAmount: number | null; quantity: number | null };
      _count: number;
      userName: string;
    }> = [];
    
    if (!query.userId) {
      // Get work grouped by user
      const workByUser = await this.prisma.work.findMany({
        where,
        select: {
          userId: true,
          totalAmount: true,
          quantity: true,
        },
      });

      // Manual grouping to avoid TypeScript issues with groupBy
      const groupedMap = new Map<number, { totalAmount: number; quantity: number; count: number }>();
      for (const work of workByUser) {
        const existing = groupedMap.get(work.userId) || { totalAmount: 0, quantity: 0, count: 0 };
        // Handle Decimal type - might be Decimal or number depending on Prisma version
        const amount = typeof work.totalAmount === 'object' && work.totalAmount !== null && 'toNumber' in work.totalAmount
          ? (work.totalAmount as any).toNumber()
          : Number(work.totalAmount || 0);
        groupedMap.set(work.userId, {
          totalAmount: existing.totalAmount + amount,
          quantity: existing.quantity + (work.quantity || 0),
          count: existing.count + 1,
        });
      }

      // Enrich with user details
      const userIds = Array.from(groupedMap.keys());
      const users = await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true },
      });
      const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]));

      workerBreakdown = userIds.map((userId) => {
        const data = groupedMap.get(userId)!;
        return {
          userId,
          _sum: { totalAmount: data.totalAmount, quantity: data.quantity },
          _count: data.count,
          userName: userMap[userId] || 'Unknown',
        };
      });
    }

    return {
      summary: {
        totalRecords: aggregation._count,
        totalQuantity: aggregation._sum.quantity || 0,
        totalEarnings: aggregation._sum.totalAmount || 0,
        averageQuantity: Math.round(aggregation._avg.quantity || 0),
        averagePricePerUnit: Math.round((aggregation._avg.pricePerUnit || 0) * 100) / 100,
        averageEarning: Math.round((aggregation._avg.totalAmount || 0) * 100) / 100,
        highestEarning: aggregation._max.totalAmount || 0,
        lowestEarning: aggregation._min.totalAmount || 0,
        dateRange: {
          from: aggregation._min.date,
          to: aggregation._max.date,
        },
      },
      dailyBreakdown: dailyWork,
      workerBreakdown,
    };
  }
}

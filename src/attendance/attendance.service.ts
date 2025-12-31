import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  UpdateAttendanceDto,
  AttendanceQueryDto,
  CreateAttendanceDto,
  AttendanceStatus,
} from './dto/attendance.dto';

/**
 * Attendance Service
 * Handles attendance tracking based on daily work entries
 * Follows international standards for date handling (ISO 8601)
 */
@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  /**
   * Normalize date to start of day in UTC
   */
  private normalizeDate(dateStr: string): Date {
    const date = new Date(dateStr);
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }

  /**
   * Format date to ISO string (YYYY-MM-DD)
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Get attendance for a specific date
   * Returns all attendance records for that day
   */
  async getAttendanceByDate(date: string) {
    const normalizedDate = this.normalizeDate(date);

    const attendance = await this.prisma.attendance.findMany({
      where: { date: normalizedDate },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        work: {
          include: {
            description: true,
          },
        },
      },
      orderBy: {
        user: {
          name: 'asc',
        },
      },
    });

    return {
      date: this.formatDate(normalizedDate),
      records: attendance,
      summary: {
        total: attendance.length,
        present: attendance.filter((a) => a.status === 'PRESENT').length,
        absent: attendance.filter((a) => a.status === 'ABSENT').length,
        halfDay: attendance.filter((a) => a.status === 'HALF_DAY').length,
        leave: attendance.filter((a) => a.status === 'LEAVE').length,
      },
    };
  }

  /**
   * Get attendance for a user on a specific date
   */
  async getAttendanceForUser(userId: number, date: string) {
    const normalizedDate = this.normalizeDate(date);

    return this.prisma.attendance.findUnique({
      where: {
        date_userId: {
          date: normalizedDate,
          userId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        work: {
          include: {
            description: true,
          },
        },
      },
    });
  }

  /**
   * Get attendance range for a user or all users
   */
  async getAttendanceRange(
    startDate: string,
    endDate: string,
    userId?: number,
  ) {
    const normalizedStart = this.normalizeDate(startDate);
    const normalizedEnd = this.normalizeDate(endDate);

    const where: any = {
      date: {
        gte: normalizedStart,
        lte: normalizedEnd,
      },
    };

    if (userId) {
      where.userId = userId;
    }

    return this.prisma.attendance.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        work: {
          include: {
            description: true,
          },
        },
      },
      orderBy: [{ date: 'desc' }, { userId: 'asc' }],
    });
  }

  /**
   * Get attendance summary with statistics
   */
  async getAttendanceSummary(
    startDate: string,
    endDate: string,
    userId?: number,
  ) {
    const normalizedStart = this.normalizeDate(startDate);
    const normalizedEnd = this.normalizeDate(endDate);

    const where: any = {
      date: {
        gte: normalizedStart,
        lte: normalizedEnd,
      },
    };

    if (userId) {
      where.userId = userId;
    }

    const attendance = await this.prisma.attendance.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Calculate statistics
    const stats = {
      totalDays: 0,
      presentDays: 0,
      absentDays: 0,
      halfDays: 0,
      leaveDays: 0,
      attendanceRate: 0,
    };

    const uniqueDates = new Set(attendance.map((a) => a.date.toISOString()));
    stats.totalDays = uniqueDates.size;
    stats.presentDays = attendance.filter((a) => a.status === 'PRESENT').length;
    stats.absentDays = attendance.filter((a) => a.status === 'ABSENT').length;
    stats.halfDays = attendance.filter((a) => a.status === 'HALF_DAY').length;
    stats.leaveDays = attendance.filter((a) => a.status === 'LEAVE').length;

    if (stats.totalDays > 0) {
      const effectiveDays = stats.presentDays + stats.halfDays * 0.5;
      const totalPossible = stats.totalDays - stats.leaveDays;
      stats.attendanceRate =
        totalPossible > 0
          ? Math.round((effectiveDays / totalPossible) * 100)
          : 100;
    }

    // Group by user for detailed breakdown
    const byUser = new Map();
    attendance.forEach((a) => {
      if (!byUser.has(a.userId)) {
        byUser.set(a.userId, {
          userId: a.userId,
          userName: a.user.name,
          present: 0,
          absent: 0,
          halfDay: 0,
          leave: 0,
          total: 0,
        });
      }
      const userStats = byUser.get(a.userId);
      userStats.total++;
      switch (a.status) {
        case 'PRESENT':
          userStats.present++;
          break;
        case 'ABSENT':
          userStats.absent++;
          break;
        case 'HALF_DAY':
          userStats.halfDay++;
          break;
        case 'LEAVE':
          userStats.leave++;
          break;
      }
    });

    return {
      dateRange: {
        from: this.formatDate(normalizedStart),
        to: this.formatDate(normalizedEnd),
      },
      summary: stats,
      byUser: Array.from(byUser.values()),
    };
  }

  /**
   * Get complete attendance report for all workers
   */
  async getAllAttendanceReport(startDate: string, endDate: string) {
    const normalizedStart = this.normalizeDate(startDate);
    const normalizedEnd = this.normalizeDate(endDate);

    // Get all workers
    const workers = await this.prisma.user.findMany({
      where: { role: 'WORKER' },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { name: 'asc' },
    });

    // Get all attendance records
    const attendance = await this.prisma.attendance.findMany({
      where: {
        date: {
          gte: normalizedStart,
          lte: normalizedEnd,
        },
      },
      include: {
        work: {
          select: {
            quantity: true,
            totalAmount: true,
          },
        },
      },
    });

    // Create a map for quick lookup
    const attendanceMap = new Map();
    attendance.forEach((a) => {
      const key = `${a.userId}-${this.formatDate(a.date)}`;
      attendanceMap.set(key, a);
    });

    // Generate date range
    const dates: string[] = [];
    const current = new Date(normalizedStart);
    while (current <= normalizedEnd) {
      dates.push(this.formatDate(current));
      current.setDate(current.getDate() + 1);
    }

    // Build report
    const report = workers.map((worker) => {
      const workerAttendance = dates.map((date) => {
        const key = `${worker.id}-${date}`;
        const record = attendanceMap.get(key);
        return {
          date,
          status: record?.status || null,
          hasWork: !!record?.work,
          quantity: record?.work?.quantity || 0,
          amount: record?.work?.totalAmount || 0,
        };
      });

      const stats = {
        present: workerAttendance.filter((a) => a.status === 'PRESENT').length,
        absent: workerAttendance.filter((a) => a.status === 'ABSENT').length,
        halfDay: workerAttendance.filter((a) => a.status === 'HALF_DAY').length,
        leave: workerAttendance.filter((a) => a.status === 'LEAVE').length,
        noRecord: workerAttendance.filter((a) => a.status === null).length,
        totalEarnings: workerAttendance.reduce((sum, a) => sum + a.amount, 0),
        totalQuantity: workerAttendance.reduce((sum, a) => sum + a.quantity, 0),
      };

      return {
        worker,
        attendance: workerAttendance,
        stats,
      };
    });

    return {
      dateRange: {
        from: this.formatDate(normalizedStart),
        to: this.formatDate(normalizedEnd),
      },
      dates,
      report,
    };
  }

  /**
   * Update attendance status manually
   * Admin can mark leave, half-day, absent, etc.
   */
  async updateAttendanceStatus(date: string, dto: UpdateAttendanceDto) {
    const normalizedDate = this.normalizeDate(date);

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${dto.userId} not found`);
    }

    // Check if attendance exists
    const existing = await this.prisma.attendance.findUnique({
      where: {
        date_userId: {
          date: normalizedDate,
          userId: dto.userId,
        },
      },
    });

    if (existing) {
      // Update existing
      return this.prisma.attendance.update({
        where: { id: existing.id },
        data: { status: dto.status },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          work: true,
        },
      });
    } else {
      // Create new attendance record
      return this.prisma.attendance.create({
        data: {
          date: normalizedDate,
          userId: dto.userId,
          status: dto.status,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    }
  }

  /**
   * Create manual attendance record
   * Used when creating attendance without work
   */
  async createAttendance(dto: CreateAttendanceDto) {
    const normalizedDate = this.normalizeDate(dto.date);

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${dto.userId} not found`);
    }

    // Check if attendance already exists
    const existing = await this.prisma.attendance.findUnique({
      where: {
        date_userId: {
          date: normalizedDate,
          userId: dto.userId,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Attendance already exists for user ${dto.userId} on ${dto.date}`,
      );
    }

    return this.prisma.attendance.create({
      data: {
        date: normalizedDate,
        userId: dto.userId,
        status: dto.status,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Get my attendance history
   */
  async getMyAttendance(userId: number, startDate?: string, endDate?: string) {
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

    return this.prisma.attendance.findMany({
      where,
      include: {
        work: {
          include: {
            description: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });
  }
}

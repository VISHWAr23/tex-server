import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { CreateSalaryPaymentDto, UserWithSalaryDto } from './dto/salary-payment.dto';
import { plainToClass } from 'class-transformer';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all users (admin only)
   */
  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map(user => plainToClass(UserResponseDto, user));
  }

  /**
   * Get user by ID
   */
  async findById(id: number): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return plainToClass(UserResponseDto, user);
  }

  /**
   * Get current user by email
   */
  async findByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }

    return user;
  }

  /**
   * Create a new user (admin only)
   */
  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException(`User with email ${dto.email} already exists`);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        password: hashedPassword,
        role: dto.role,
        monthlySalary: dto.monthlySalary || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return plainToClass(UserResponseDto, user);
  }

  /**
   * Update user details (admin can update any user, user can update themselves)
   */
  async update(id: number, dto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Check if email is being updated and if it's already taken
    if (dto.email && dto.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (existingUser) {
        throw new ConflictException(`Email ${dto.email} is already in use`);
      }
    }

    const updateData: any = {};
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.role !== undefined) updateData.role = dto.role;
    if (dto.monthlySalary !== undefined) updateData.monthlySalary = dto.monthlySalary;

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return plainToClass(UserResponseDto, updatedUser);
  }

  /**
   * Change user password
   */
  async changePassword(userId: number, dto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.password);

    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Password changed successfully' };
  }

  /**
   * Delete user (admin only)
   */
  async delete(id: number): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    await this.prisma.user.delete({ where: { id } });

    return { message: `User with ID ${id} has been deleted` };
  }

  /**
   * Get user statistics (admin only)
   */
  async getStatistics() {
    const totalUsers = await this.prisma.user.count();

    const usersByRole = await this.prisma.user.groupBy({
      by: ['role'],
      _count: { id: true },
    });

    return {
      totalUsers,
      byRole: usersByRole.map(r => ({
        role: r.role,
        count: r._count.id,
      })),
    };
  }

  /**
   * Get worker details with salary information
   * Includes monthly salary, payments, and remaining balance
   */
  async getWorkerDetails(userId: number, month?: string): Promise<UserWithSalaryDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        monthlySalary: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Determine the month range
    let startDate: Date;
    let endDate: Date;

    if (month) {
      // Parse month format: YYYY-MM
      const [year, monthNum] = month.split('-').map(Number);
      startDate = new Date(year, monthNum - 1, 1);
      endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);
    } else {
      // Current month
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // Get salary payments for the month
    const salaryPayments = await this.prisma.salaryPayment.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'desc' },
      select: {
        id: true,
        amount: true,
        date: true,
        note: true,
      },
    });

    // Calculate total paid this month
    const totalPaidThisMonth = salaryPayments.reduce((sum, payment) => sum + payment.amount, 0);

    // Calculate remaining salary
    const monthlySalary = user.monthlySalary || 0;
    const remainingSalary = monthlySalary - totalPaidThisMonth;

    // Get work statistics for the month
    const workStats = await this.prisma.work.aggregate({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: { totalAmount: true },
      _count: { id: true },
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      monthlySalary: user.monthlySalary,
      totalPaidThisMonth,
      remainingSalary,
      salaryPayments,
      totalWorkAmount: workStats._sum.totalAmount || 0,
      totalWorkEntries: workStats._count.id || 0,
      createdAt: user.createdAt,
    };
  }

  /**
   * Create a salary payment for a worker
   * Deducts from their monthly salary
   */
  async createSalaryPayment(userId: number, dto: CreateSalaryPaymentDto) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, monthlySalary: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Parse date or use current date
    const paymentDate = dto.date ? new Date(dto.date) : new Date();

    // Create salary payment
    const payment = await this.prisma.salaryPayment.create({
      data: {
        userId,
        amount: dto.amount,
        date: paymentDate,
        note: dto.note || null,
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

    return payment;
  }

  /**
   * Get all salary payments for a user
   */
  async getSalaryPayments(userId: number, startDate?: string, endDate?: string) {
    const where: any = { userId };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    return this.prisma.salaryPayment.findMany({
      where,
      orderBy: { date: 'desc' },
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
   * Delete a salary payment
   */
  async deleteSalaryPayment(paymentId: number) {
    const payment = await this.prisma.salaryPayment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException(`Salary payment with ID ${paymentId} not found`);
    }

    await this.prisma.salaryPayment.delete({
      where: { id: paymentId },
    });

    return { message: 'Salary payment deleted successfully' };
  }
}


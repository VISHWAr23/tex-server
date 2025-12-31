import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserResponseDto } from './dto/user-response.dto';
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

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        email: dto.email || user.email,
        name: dto.name || user.name,
        role: dto.role || user.role,
      },
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
}

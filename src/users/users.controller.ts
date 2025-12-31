import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserResponseDto } from './dto/user-response.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Get all users (OWNER only)
   * GET /api/users
   */
  @Get()
  @Roles(Role.OWNER)
  async findAll(): Promise<UserResponseDto[]> {
    return this.usersService.findAll();
  }

  /**
   * Get user statistics (OWNER only)
   * GET /api/users/stats
   */
  @Get('stats')
  @Roles(Role.OWNER)
  async getStatistics() {
    return this.usersService.getStatistics();
  }

  /**
   * Get current user profile
   * GET /api/users/me
   */
  @Get('me')
  async getCurrentUser(@Req() req: any): Promise<UserResponseDto> {
    return this.usersService.findById(req.user.sub);
  }

  /**
   * Get user by ID (OWNER can get any user, user can get their own)
   * GET /api/users/:id
   */
  @Get(':id')
  async findById(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ): Promise<UserResponseDto> {
    // Allow OWNER to view any user, or user to view themselves
    if (req.user.role !== Role.OWNER && req.user.sub !== id) {
      throw new ForbiddenException('You can only view your own profile');
    }
    return this.usersService.findById(id);
  }

  /**
   * Create a new user (OWNER only)
   * POST /api/users
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.OWNER)
  async create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(createUserDto);
  }

  /**
   * Update user details (OWNER can update any user, user can update themselves)
   * PUT /api/users/:id
   */
  @Put(':id')
  @Roles(Role.OWNER, Role.WORKER)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: any,
  ): Promise<UserResponseDto> {
    // Allow OWNER to update any user, or user to update themselves
    if (req.user.role !== Role.OWNER && req.user.sub !== id) {
      throw new ForbiddenException('You can only update your own profile');
    }

    // Non-OWNER users cannot change their role
    if (req.user.role !== Role.OWNER && updateUserDto.role) {
      throw new ForbiddenException('You cannot change your role');
    }

    return this.usersService.update(id, updateUserDto);
  }

  /**
   * Change password (any authenticated user)
   * POST /api/users/:id/change-password
   */
  @Post(':id/change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() changePasswordDto: ChangePasswordDto,
    @Req() req: any,
  ) {
    // Allow OWNER to change any user password, or user to change their own
    if (req.user.role !== Role.OWNER && req.user.sub !== id) {
      throw new ForbiddenException('You can only change your own password');
    }
    return this.usersService.changePassword(id, changePasswordDto);
  }

  /**
   * Delete user (OWNER only)
   * DELETE /api/users/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.OWNER)
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.delete(id);
  }
}
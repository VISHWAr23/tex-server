import {
  Controller,
  Get,
  Post,
  Put,
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
import { AttendanceService } from './attendance.service';
import {
  UpdateAttendanceDto,
  CreateAttendanceDto,
} from './dto/attendance.dto';

/**
 * Attendance Controller
 * Handles all attendance-related HTTP requests
 * Base path: /api/attendance
 */
@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(private attendanceService: AttendanceService) {}

  /**
   * GET /api/attendance/my-attendance
   * Get own attendance history
   */
  @Get('my-attendance')
  async getMyAttendance(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.attendanceService.getMyAttendance(
      req.user.sub,
      startDate,
      endDate,
    );
  }

  /**
   * GET /api/attendance/by-date/:date
   * Get all attendance for a specific date (Admin only)
   */
  @Get('by-date/:date')
  @Roles('OWNER')
  async getAttendanceByDate(@Param('date') date: string) {
    return this.attendanceService.getAttendanceByDate(date);
  }

  /**
   * GET /api/attendance/range/:startDate/:endDate
   * Get attendance for date range
   */
  @Get('range/:startDate/:endDate')
  async getAttendanceRange(
    @Request() req,
    @Param('startDate') startDate: string,
    @Param('endDate') endDate: string,
    @Query('userId') userId?: string,
  ) {
    let targetUserId = userId ? parseInt(userId, 10) : undefined;

    // Workers can only see their own attendance
    if (req.user.role === 'WORKER') {
      targetUserId = req.user.sub;
    }

    return this.attendanceService.getAttendanceRange(
      startDate,
      endDate,
      targetUserId,
    );
  }

  /**
   * GET /api/attendance/summary/:startDate/:endDate
   * Get attendance summary with statistics
   */
  @Get('summary/:startDate/:endDate')
  async getAttendanceSummary(
    @Request() req,
    @Param('startDate') startDate: string,
    @Param('endDate') endDate: string,
    @Query('userId') userId?: string,
  ) {
    let targetUserId = userId ? parseInt(userId, 10) : undefined;

    // Workers can only see their own summary
    if (req.user.role === 'WORKER') {
      targetUserId = req.user.sub;
    }

    return this.attendanceService.getAttendanceSummary(
      startDate,
      endDate,
      targetUserId,
    );
  }

  /**
   * GET /api/attendance/report/all/:startDate/:endDate
   * Get complete attendance report for all workers (Admin only)
   */
  @Get('report/all/:startDate/:endDate')
  @Roles('OWNER')
  async getAllAttendanceReport(
    @Param('startDate') startDate: string,
    @Param('endDate') endDate: string,
  ) {
    return this.attendanceService.getAllAttendanceReport(startDate, endDate);
  }

  /**
   * GET /api/attendance/:date
   * Get attendance for a specific date and optionally a user
   */
  @Get(':date')
  async getAttendance(
    @Request() req,
    @Param('date') date: string,
    @Query('userId') userId?: string,
  ) {
    let targetUserId = userId ? parseInt(userId, 10) : req.user.sub;

    // Workers can only see their own attendance
    if (req.user.role === 'WORKER') {
      targetUserId = req.user.sub;
    }

    return this.attendanceService.getAttendanceForUser(targetUserId, date);
  }

  /**
   * POST /api/attendance
   * Create manual attendance record (Admin only)
   */
  @Post()
  @Roles('OWNER')
  async createAttendance(@Body() dto: CreateAttendanceDto) {
    return this.attendanceService.createAttendance(dto);
  }

  /**
   * PUT /api/attendance/:date/status
   * Update attendance status manually (Admin only)
   */
  @Put(':date/status')
  @Roles('OWNER')
  async updateAttendanceStatus(
    @Param('date') date: string,
    @Body() dto: UpdateAttendanceDto,
  ) {
    return this.attendanceService.updateAttendanceStatus(date, dto);
  }
}

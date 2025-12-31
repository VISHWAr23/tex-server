import { IsEnum, IsDateString, IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Attendance status enum matching Prisma schema
 */
export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  HALF_DAY = 'HALF_DAY',
  LEAVE = 'LEAVE',
}

/**
 * DTO for updating attendance status manually
 * Used by admin to mark leave, half-day, etc.
 */
export class UpdateAttendanceDto {
  @Type(() => Number)
  @IsInt()
  userId: number;

  @IsEnum(AttendanceStatus, {
    message: 'Status must be PRESENT, ABSENT, HALF_DAY, or LEAVE',
  })
  status: AttendanceStatus;
}

/**
 * DTO for querying attendance records
 */
export class AttendanceQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

/**
 * DTO for creating manual attendance (when no work is done)
 */
export class CreateAttendanceDto {
  @IsDateString()
  date: string;

  @Type(() => Number)
  @IsInt()
  userId: number;

  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;
}

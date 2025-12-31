import { IsOptional, IsDateString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for querying work records
 * Supports filtering by date range and user
 */
export class WorkQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;

  @IsOptional()
  @IsDateString({}, { message: 'Start date must be in ISO 8601 format (YYYY-MM-DD)' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'End date must be in ISO 8601 format (YYYY-MM-DD)' })
  endDate?: string;
}

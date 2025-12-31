import { IsEnum, IsNumber, IsString, IsDateString, IsOptional, Min, MaxLength } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ExpenseType } from '@prisma/client';

/**
 * DTO for creating a new expense
 */
export class CreateExpenseDto {
  @IsEnum(ExpenseType, { message: 'Type must be either COMPANY or HOME' })
  type: ExpenseType;

  @IsString({ message: 'Category is required' })
  @MaxLength(100, { message: 'Category must be at most 100 characters' })
  @Transform(({ value }) => value?.trim())
  category: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Amount must be a number' })
  @Min(0.01, { message: 'Amount must be greater than 0' })
  amount: number;

  @IsOptional()
  @IsDateString({}, { message: 'Date must be in ISO 8601 format' })
  date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Note must be at most 500 characters' })
  @Transform(({ value }) => value?.trim())
  note?: string;
}

/**
 * DTO for updating an expense
 */
export class UpdateExpenseDto {
  @IsOptional()
  @IsEnum(ExpenseType, { message: 'Type must be either COMPANY or HOME' })
  type?: ExpenseType;

  @IsOptional()
  @IsString({ message: 'Category is required' })
  @MaxLength(100, { message: 'Category must be at most 100 characters' })
  @Transform(({ value }) => value?.trim())
  category?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Amount must be a number' })
  @Min(0.01, { message: 'Amount must be greater than 0' })
  amount?: number;

  @IsOptional()
  @IsDateString({}, { message: 'Date must be in ISO 8601 format' })
  date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Note must be at most 500 characters' })
  @Transform(({ value }) => value?.trim())
  note?: string;
}

/**
 * DTO for querying expenses
 */
export class ExpenseQueryDto {
  @IsOptional()
  @IsEnum(ExpenseType)
  type?: ExpenseType;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

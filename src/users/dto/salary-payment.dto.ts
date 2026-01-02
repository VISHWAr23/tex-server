import { IsNumber, IsOptional, IsString, IsDateString, Min } from 'class-validator';

/**
 * DTO for creating a salary payment
 */
export class CreateSalaryPaymentDto {
  @IsNumber()
  @Min(0.01, { message: 'Payment amount must be greater than 0' })
  amount: number;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

/**
 * DTO for querying salary payments
 */
export class SalaryPaymentQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  userId?: number;
}

/**
 * Response DTO for user with salary information
 */
export class UserWithSalaryDto {
  id: number;
  name: string;
  email: string;
  role: string;
  monthlySalary: number | null;
  totalPaidThisMonth: number;
  remainingSalary: number;
  salaryPayments: {
    id: number;
    amount: number;
    date: Date;
    note: string | null;
  }[];
  totalWorkAmount?: number;
  totalWorkEntries?: number;
  createdAt: Date;
}

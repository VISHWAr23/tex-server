import { IsEmail, IsString, IsEnum, MinLength, MaxLength, IsOptional, IsNumber, Min } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email: string;

  @IsString({ message: 'Name must be a string' })
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name: string;

  @IsString({ message: 'Password must be a string' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @IsEnum(Role, { message: 'Role must be either OWNER or WORKER' })
  role: Role;

  @IsOptional()
  @IsNumber({}, { message: 'Monthly salary must be a number' })
  @Min(0, { message: 'Monthly salary cannot be negative' })
  monthlySalary?: number;
}

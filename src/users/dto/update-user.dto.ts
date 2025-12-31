import { IsEmail, IsString, IsEnum, MinLength, MaxLength, IsOptional } from 'class-validator';
import { Role } from '@prisma/client';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email?: string;

  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name?: string;

  @IsOptional()
  @IsEnum(Role, { message: 'Role must be either OWNER or WORKER' })
  role?: Role;
}

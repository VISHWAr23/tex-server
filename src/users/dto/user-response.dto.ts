import { Exclude } from 'class-transformer';
import { Role } from '@prisma/client';

export class UserResponseDto {
  id: number;
  email: string;
  name: string;
  role: Role;
  createdAt: Date;

  @Exclude()
  password?: string;
}

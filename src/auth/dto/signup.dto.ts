import { Role } from '@prisma/client';
export class SignupDto {
  email: string;
  password: string;
  name: string;
  role?: Role; // Optional, defaults to WORKER
}
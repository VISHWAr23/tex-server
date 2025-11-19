import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}
  create(data: any) { return this.prisma.expense.create({ data }); }
  findAll() { return this.prisma.expense.findMany(); }
}
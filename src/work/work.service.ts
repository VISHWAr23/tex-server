import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkDto } from './dto/create-work.dto';

@Injectable()
export class WorkService {
  constructor(private prisma: PrismaService) {}

  async create(userId: number, dto: CreateWorkDto) {
    return this.prisma.work.create({
      data: { ...dto, userId },
    });
  }

  async findAll() {
    return this.prisma.work.findMany();
  }
  
  async findMyWork(userId: number) {
    return this.prisma.work.findMany({ where: { userId } });
  }
}
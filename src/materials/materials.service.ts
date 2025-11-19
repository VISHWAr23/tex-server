import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MaterialsService {
  constructor(private prisma: PrismaService) {}

  create(data: any) {
    return this.prisma.material.create({ data });
  }

  findAll() {
    return this.prisma.material.findMany();
  }
}
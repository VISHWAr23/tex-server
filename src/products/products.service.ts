import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}
  create(data: any) {
    // Convert strings to DateTime objects if necessary
    return this.prisma.product.create({ 
        data: {
            ...data,
            startDate: new Date(data.startDate)
        } 
    });
  }
  findAll() { return this.prisma.product.findMany(); }
}
import { Module } from '@nestjs/common';
import { WorkController } from './work.controller';
import { WorkService } from './work.service';
import { PrismaService } from '../prisma/prisma.service'; // <--- Import this

@Module({
  controllers: [WorkController],
  providers: [WorkService, PrismaService], // <--- Add PrismaService here
})
export class WorkModule {}
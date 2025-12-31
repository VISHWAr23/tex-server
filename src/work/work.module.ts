import { Module } from '@nestjs/common';
import { WorkController } from './work.controller';
import { WorkService } from './work.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [WorkController],
  providers: [WorkService, PrismaService],
  exports: [WorkService],
})
export class WorkModule {}

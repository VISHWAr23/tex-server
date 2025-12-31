import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      log: ['query', 'info', 'warn', 'error'],
    });
  }

  async onModuleInit() {
    try {
      this.logger.log('Connecting to database...');
      this.logger.log(`Database URL: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@')}`);
      await this.$connect();
      this.logger.log('Successfully connected to database');
    } catch (error) {
      this.logger.error('Failed to connect to database:', error.message);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
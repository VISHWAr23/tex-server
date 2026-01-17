import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { FinanceModule } from './finance/finance.module';
import { PrismaService } from './prisma/prisma.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WorkModule } from './work/work.module';
import { AttendanceModule } from './attendance/attendance.module';
import { ExportsModule } from './exports/exports.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    AuthModule,
    UsersModule,
    FinanceModule,
    WorkModule,
    AttendanceModule,
    ExportsModule,
    AnalyticsModule,
  ],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WorkModule } from './work/work.module';
import { MaterialsModule } from './materials/materials.module';
import { ProductsModule } from './products/products.module';
import { FinanceModule } from './finance/finance.module';
import { PrismaService } from './prisma/prisma.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    UsersModule,
    WorkModule,
    MaterialsModule,
    ProductsModule,
    FinanceModule,
  ],
  providers: [PrismaService],
})
export class AppModule {}
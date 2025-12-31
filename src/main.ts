import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import {
  PrismaExceptionFilter,
  PrismaValidationExceptionFilter,
  AllExceptionsFilter,
} from './common/filters/prisma-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Add global exception filters (order matters - most specific first)
  app.useGlobalFilters(
    new AllExceptionsFilter(),
    new PrismaValidationExceptionFilter(),
    new PrismaExceptionFilter(),
  );

  // 2. Add validation pipe for DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 3. Add this line to match your React Axios baseURL
  app.setGlobalPrefix('api');

  // 4. Ensure CORS is enabled
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  await app.listen(3000);
  console.log('Server running on http://localhost:3000/api');
}
bootstrap();
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import {
  PrismaExceptionFilter,
  PrismaValidationExceptionFilter,
  AllExceptionsFilter,
} from './common/filters/prisma-exception.filter';
import { ExpressAdapter } from '@nestjs/platform-express';
import * as express from 'express';

// Create Express instance
const expressApp = express();

// Export the Express app for Vercel
export const app = expressApp;

// Factory function to create and configure NestJS app
async function createNestApp() {
  const adapter = new ExpressAdapter(expressApp);
  const nestApp = await NestFactory.create(AppModule, adapter);

  // 1. Add global exception filters (order matters - most specific first)
  nestApp.useGlobalFilters(
    new AllExceptionsFilter(),
    new PrismaValidationExceptionFilter(),
    new PrismaExceptionFilter(),
  );

  // 2. Add validation pipe for DTOs
  nestApp.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 3. Add this line to match your React Axios baseURL
  nestApp.setGlobalPrefix('api');

  // 4. Ensure CORS is enabled
  nestApp.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  await nestApp.init();
  return nestApp;
}

// For local development
async function bootstrap() {
  const nestApp = await createNestApp();
  await nestApp.listen(3000);
  console.log('Server running on http://localhost:3000/api');
}

// Initialize app for Vercel serverless
createNestApp();

// Only run bootstrap if not in serverless environment
if (require.main === module) {
  bootstrap();
}
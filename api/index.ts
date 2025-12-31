import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import {
  PrismaExceptionFilter,
  PrismaValidationExceptionFilter,
  AllExceptionsFilter,
} from '../src/common/filters/prisma-exception.filter';
import express, { Express } from 'express';

const expressApp: Express = express();
let isAppInitialized = false;

async function initializeApp() {
  if (!isAppInitialized) {
    const app = await NestFactory.create(
      AppModule,
      new ExpressAdapter(expressApp),
      { logger: ['error', 'warn', 'log'] }
    );

    // Add global exception filters
    app.useGlobalFilters(
      new AllExceptionsFilter(),
      new PrismaValidationExceptionFilter(),
      new PrismaExceptionFilter(),
    );

    // Add validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // Enable CORS
    app.enableCors({
      origin: true,
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    });

    await app.init();
    isAppInitialized = true;
  }
}

// Initialize on module load
initializeApp();

// Export the Express app for Vercel
module.exports = expressApp;
export default expressApp;

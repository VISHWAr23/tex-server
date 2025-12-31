import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

/**
 * Global exception filter for Prisma errors
 * Converts Prisma-specific errors to user-friendly HTTP responses
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected database error occurred';

    switch (exception.code) {
      // Unique constraint violation
      case 'P2002': {
        status = HttpStatus.CONFLICT;
        const target = exception.meta?.target as string[];
        const field = target?.join(', ') || 'field';
        message = `A record with this ${field} already exists`;
        break;
      }

      // Foreign key constraint violation
      case 'P2003': {
        status = HttpStatus.BAD_REQUEST;
        const field = exception.meta?.field_name as string;
        message = `Invalid reference: ${field || 'related record'} does not exist`;
        break;
      }

      // Record not found (for update/delete)
      case 'P2025': {
        status = HttpStatus.NOT_FOUND;
        message = 'Record not found';
        break;
      }

      // Required field missing
      case 'P2011': {
        status = HttpStatus.BAD_REQUEST;
        const field = exception.meta?.constraint as string;
        message = `Missing required field: ${field}`;
        break;
      }

      // Invalid value for field type
      case 'P2006': {
        status = HttpStatus.BAD_REQUEST;
        message = 'Invalid value provided for one or more fields';
        break;
      }

      // Value too long for column
      case 'P2000': {
        status = HttpStatus.BAD_REQUEST;
        message = 'Value too long for field';
        break;
      }

      // Table does not exist
      case 'P2021': {
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = 'Database table not found. Please run migrations.';
        break;
      }

      // Column does not exist
      case 'P2022': {
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = 'Database column not found. Please run migrations.';
        break;
      }

      default:
        console.error('Unhandled Prisma error:', exception.code, exception.message);
    }

    response.status(status).json({
      statusCode: status,
      message,
      error: this.getErrorName(status),
      timestamp: new Date().toISOString(),
    });
  }

  private getErrorName(status: HttpStatus): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'Bad Request';
      case HttpStatus.NOT_FOUND:
        return 'Not Found';
      case HttpStatus.CONFLICT:
        return 'Conflict';
      default:
        return 'Internal Server Error';
    }
  }
}

/**
 * Filter for Prisma validation errors
 */
@Catch(Prisma.PrismaClientValidationError)
export class PrismaValidationExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientValidationError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    console.error('Prisma validation error:', exception.message);

    response.status(HttpStatus.BAD_REQUEST).json({
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Invalid data provided. Please check your input.',
      error: 'Bad Request',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Global catch-all exception filter
 * Handles any unhandled exceptions
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected error occurred';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message || exception.message;
    } else if (exception instanceof Error) {
      console.error('Unhandled error:', exception.message, exception.stack);
      message = 'Internal server error';
    }

    response.status(status).json({
      statusCode: status,
      message: Array.isArray(message) ? message : [message],
      error: this.getErrorName(status),
      timestamp: new Date().toISOString(),
    });
  }

  private getErrorName(status: HttpStatus): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'Bad Request';
      case HttpStatus.UNAUTHORIZED:
        return 'Unauthorized';
      case HttpStatus.FORBIDDEN:
        return 'Forbidden';
      case HttpStatus.NOT_FOUND:
        return 'Not Found';
      case HttpStatus.CONFLICT:
        return 'Conflict';
      default:
        return 'Internal Server Error';
    }
  }
}

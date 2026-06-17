import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from '../logging/logger.service';
import { CORRELATION_ID_HEADER } from '../logging/correlation-id.middleware';
import { ErrorResponse } from './error-response.interface';

@Catch()
@Injectable()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const correlationId =
      (request.headers[CORRELATION_ID_HEADER.toLowerCase()] as string) || null;

    const { statusCode, errorName, message, details } = this.extractErrorInfo(exception);

    // Log the full error internally (including stack trace)
    this.logger.setCorrelationId(correlationId || '');
    this.logger.error(
      `Unhandled exception: ${message}`,
      exception instanceof Error ? exception.stack : undefined,
      {
        method: request.method,
        path: request.url,
        status_code: statusCode,
        error_type: errorName,
      },
    );

    // Build sanitized response (no stack traces, no internal paths, no versions)
    const errorResponse: ErrorResponse = {
      statusCode,
      error: errorName,
      message: this.sanitizeMessage(message, statusCode),
      details: details || null,
      correlation_id: correlationId,
      timestamp: new Date().toISOString(),
    };

    response.status(statusCode).json(errorResponse);
  }

  private extractErrorInfo(exception: unknown): {
    statusCode: number;
    errorName: string;
    message: string;
    details: { field: string; message: string }[] | null;
  } {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;

        // Handle class-validator ValidationPipe errors
        if (Array.isArray(resp['message'])) {
          const details = this.parseValidationErrors(resp['message'] as string[]);
          return {
            statusCode,
            errorName: (resp['error'] as string) || 'Bad Request',
            message: 'Validation failed',
            details,
          };
        }

        return {
          statusCode,
          errorName: (resp['error'] as string) || this.getErrorName(statusCode),
          message: (resp['message'] as string) || exception.message,
          details: null,
        };
      }

      return {
        statusCode,
        errorName: this.getErrorName(statusCode),
        message: typeof exceptionResponse === 'string' ? exceptionResponse : exception.message,
        details: null,
      };
    }

    // Unknown/unhandled errors — never expose internal details
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      errorName: 'Internal Server Error',
      message: 'An unexpected error occurred',
      details: null,
    };
  }

  private parseValidationErrors(messages: string[]): { field: string; message: string }[] {
    return messages.map((msg) => {
      // class-validator messages typically follow pattern: "fieldName constraint message"
      const parts = msg.split(' ');
      const field = parts[0] || 'unknown';
      return {
        field,
        message: msg,
      };
    });
  }

  private sanitizeMessage(message: string, statusCode: number): string {
    // For 5xx errors, never expose the original error message
    if (statusCode >= 500) {
      return 'An unexpected error occurred';
    }
    return message;
  }

  private getErrorName(statusCode: number): string {
    const names: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      503: 'Service Unavailable',
    };
    return names[statusCode] || 'Error';
  }
}

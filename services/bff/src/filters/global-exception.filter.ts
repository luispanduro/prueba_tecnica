import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const correlationId =
      (request.headers['x-correlation-id'] as string | undefined) ?? 'unknown';

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let error = 'Internal Server Error';
    let message = 'An unexpected error occurred';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        const resObj = res as { error?: string; message?: string | string[] };
        error = resObj.error ?? String(HttpStatus[statusCode] ?? 'Error');
        const raw = resObj.message ?? exception.message;
        message = Array.isArray(raw) ? raw.join(', ') : String(raw);
      } else {
        message = String(res);
      }
    }

    response.status(statusCode).json({
      statusCode,
      error,
      message,
      correlationId,
      timestamp: new Date().toISOString(),
    });
  }
}

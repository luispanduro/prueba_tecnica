import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { LoggerService } from './logger.service';
import { CORRELATION_ID_HEADER } from './correlation-id.middleware';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const startTime = Date.now();

    const correlationId =
      (request.headers[CORRELATION_ID_HEADER.toLowerCase()] as string) || undefined;

    if (correlationId) {
      this.logger.setCorrelationId(correlationId);
    }

    return next.handle().pipe(
      tap({
        next: () => {
          const response = httpContext.getResponse<Response>();
          const durationMs = Date.now() - startTime;

          this.logger.info('HTTP Request completed', {
            method: request.method,
            path: request.url,
            status_code: response.statusCode,
            duration_ms: durationMs,
            correlation_id: correlationId,
          });
        },
        error: (error: Error) => {
          const durationMs = Date.now() - startTime;
          const statusCode = (error as unknown as { status?: number }).status || 500;

          this.logger.error('HTTP Request failed', error.stack, {
            method: request.method,
            path: request.url,
            status_code: statusCode,
            duration_ms: durationMs,
            correlation_id: correlationId,
            error_message: error.message,
          });
        },
      }),
    );
  }
}

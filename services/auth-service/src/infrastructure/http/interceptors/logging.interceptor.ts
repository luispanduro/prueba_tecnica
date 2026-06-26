import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const correlationId =
      (req.headers['x-correlation-id'] as string) ?? 'unknown';
    const start = Date.now();

    this.logger.log({
      action: 'request.received',
      method: req.method,
      path: req.path,
      correlationId,
    });

    return next.handle().pipe(
      tap(() => {
        this.logger.log({
          action: 'request.completed',
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          correlationId,
          duration: Date.now() - start,
        });
      }),
    );
  }
}

import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as winston from 'winston';

@Injectable()
export class LoggerService implements NestLoggerService {
  private logger: winston.Logger;
  private serviceName: string;
  private correlationId?: string;

  constructor(serviceName = 'unknown-service') {
    this.serviceName = serviceName;
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
        winston.format.json(),
      ),
      defaultMeta: {
        service: this.serviceName,
      },
      transports: [new winston.transports.Console()],
    });
  }

  setServiceName(serviceName: string): void {
    this.serviceName = serviceName;
    this.logger.defaultMeta = { service: serviceName };
  }

  setCorrelationId(correlationId: string): void {
    this.correlationId = correlationId;
  }

  getCorrelationId(): string | undefined {
    return this.correlationId;
  }

  log(message: string, context?: Record<string, unknown>): void {
    this.logger.info(message, this.buildMeta(context));
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.logger.info(message, this.buildMeta(context));
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.logger.warn(message, this.buildMeta(context));
  }

  error(message: string, trace?: string, context?: Record<string, unknown>): void {
    this.logger.error(message, {
      ...this.buildMeta(context),
      stack_trace: trace,
    });
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.logger.debug(message, this.buildMeta(context));
  }

  verbose(message: string, context?: Record<string, unknown>): void {
    this.logger.verbose(message, this.buildMeta(context));
  }

  private buildMeta(context?: Record<string, unknown>): Record<string, unknown> {
    return {
      correlation_id: this.correlationId,
      ...context,
    };
  }
}

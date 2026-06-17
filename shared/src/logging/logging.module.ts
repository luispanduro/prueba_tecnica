import { DynamicModule, Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerService } from './logger.service';
import { CorrelationIdMiddleware } from './correlation-id.middleware';
import { HttpLoggingInterceptor } from './http-logging.interceptor';

export interface LoggingModuleOptions {
  serviceName: string;
}

@Global()
@Module({})
export class LoggingModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }

  static forRoot(options: LoggingModuleOptions): DynamicModule {
    const loggerProvider = {
      provide: LoggerService,
      useFactory: () => {
        return new LoggerService(options.serviceName);
      },
    };

    return {
      module: LoggingModule,
      providers: [
        loggerProvider,
        {
          provide: APP_INTERCEPTOR,
          useFactory: (logger: LoggerService) => new HttpLoggingInterceptor(logger),
          inject: [LoggerService],
        },
      ],
      exports: [LoggerService],
    };
  }
}

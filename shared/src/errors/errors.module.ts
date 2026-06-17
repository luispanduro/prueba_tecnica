import { Global, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { GlobalExceptionFilter } from './global-exception.filter';
import { LoggerService } from '../logging/logger.service';

@Global()
@Module({
  providers: [
    {
      provide: APP_FILTER,
      useFactory: (logger: LoggerService) => new GlobalExceptionFilter(logger),
      inject: [LoggerService],
    },
  ],
})
export class ErrorsModule {}

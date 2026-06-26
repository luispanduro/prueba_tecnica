import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { AuthApplicationModule } from './application/auth-application.module';
import { RedisModule } from './infrastructure/persistence/redis/redis.module';
import { RabbitmqModule } from './infrastructure/messaging/rabbitmq/rabbitmq.module';
import { AuthDatabaseModule } from './infrastructure/persistence/typeorm/auth-database.module';
import { JwtStrategy } from './infrastructure/http/guards/jwt.strategy';
import { JwtAuthGuard } from './infrastructure/http/guards/jwt-auth.guard';
import { AuthController } from './infrastructure/http/controllers/auth.controller';
import { HealthController } from './infrastructure/http/controllers/health.controller';
import { LoggingInterceptor } from './infrastructure/http/interceptors/logging.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    PassportModule,
    AuthDatabaseModule,
    RedisModule,
    RabbitmqModule,
    AuthApplicationModule,
  ],
  controllers: [AuthController, HealthController],
  providers: [
    JwtStrategy,
    JwtAuthGuard,
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}

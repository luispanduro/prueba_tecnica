import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { UserApplicationModule } from './application/user-application.module';
import { RabbitmqModule } from './infrastructure/messaging/rabbitmq/rabbitmq.module';
import { UserDatabaseModule } from './infrastructure/persistence/typeorm/user-database.module';
import { JwtStrategy } from './infrastructure/http/guards/jwt.strategy';
import { JwtAuthGuard } from './infrastructure/http/guards/jwt-auth.guard';
import { PermissionsGuard } from './infrastructure/http/guards/permissions.guard';
import { UsersController } from './infrastructure/http/controllers/users.controller';
import { HealthController } from './infrastructure/http/controllers/health.controller';
import { InternalController } from './infrastructure/http/controllers/internal.controller';
import { LoggingInterceptor } from './infrastructure/http/interceptors/logging.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    PassportModule,
    UserDatabaseModule,
    RabbitmqModule,
    UserApplicationModule,
  ],
  controllers: [UsersController, HealthController, InternalController],
  providers: [
    JwtStrategy,
    JwtAuthGuard,
    PermissionsGuard,
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}

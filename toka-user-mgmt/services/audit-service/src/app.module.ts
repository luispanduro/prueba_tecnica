import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { AuditDatabaseModule } from './infrastructure/persistence/mongoose/audit-database.module';
import { MessagingModule } from './infrastructure/messaging/messaging.module';
import { RabbitmqModule } from './infrastructure/messaging/rabbitmq.module';
import { JwtStrategy } from './infrastructure/http/guards/jwt.strategy';
import { JwtAuthGuard } from './infrastructure/http/guards/jwt-auth.guard';
import { PermissionsGuard } from './infrastructure/http/guards/permissions.guard';
import { AuditController } from './infrastructure/http/controllers/audit.controller';
import { HealthController } from './infrastructure/http/controllers/health.controller';
import { LoggingInterceptor } from './infrastructure/http/interceptors/logging.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    PassportModule,
    AuditDatabaseModule,
    MessagingModule,
    RabbitmqModule,
  ],
  controllers: [AuditController, HealthController],
  providers: [
    JwtStrategy,
    JwtAuthGuard,
    PermissionsGuard,
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}

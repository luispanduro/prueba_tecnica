import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { RoleApplicationModule } from './application/role-application.module';
import { RabbitmqModule } from './infrastructure/messaging/rabbitmq/rabbitmq.module';
import { RoleDatabaseModule } from './infrastructure/persistence/typeorm/role-database.module';
import { JwtStrategy } from './infrastructure/http/guards/jwt.strategy';
import { JwtAuthGuard } from './infrastructure/http/guards/jwt-auth.guard';
import { RolesController } from './infrastructure/http/controllers/roles.controller';
import { HealthController } from './infrastructure/http/controllers/health.controller';
import { RoleInternalController } from './infrastructure/http/controllers/internal.controller';
import { LoggingInterceptor } from './infrastructure/http/interceptors/logging.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    PassportModule,
    RoleDatabaseModule,
    RabbitmqModule,
    RoleApplicationModule,
  ],
  controllers: [RolesController, HealthController, RoleInternalController],
  providers: [
    JwtStrategy,
    JwtAuthGuard,
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}

import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { CorrelationIdMiddleware } from './middleware/correlation-id.middleware';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ProxyService } from './proxy/proxy.service';
import { AuthProxyController } from './proxy/auth-proxy.controller';
import { UsersProxyController } from './proxy/users-proxy.controller';
import { RolesProxyController } from './proxy/roles-proxy.controller';
import { AuditProxyController } from './proxy/audit-proxy.controller';
import { AiProxyController } from './proxy/ai-proxy.controller';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 100,
      },
    ]),
  ],
  controllers: [
    AuthProxyController,
    UsersProxyController,
    RolesProxyController,
    AuditProxyController,
    AiProxyController,
    HealthController,
  ],
  providers: [
    ProxyService,
    JwtAuthGuard,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(CorrelationIdMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}

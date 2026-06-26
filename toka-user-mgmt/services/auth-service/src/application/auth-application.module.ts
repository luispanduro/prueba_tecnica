import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthDatabaseModule } from '../infrastructure/persistence/typeorm/auth-database.module';
import { RedisModule } from '../infrastructure/persistence/redis/redis.module';
import { RabbitmqModule } from '../infrastructure/messaging/rabbitmq/rabbitmq.module';
import { RegisterUserHandler } from './handlers/register-user.handler';
import { LoginHandler } from './handlers/login.handler';
import { LogoutHandler } from './handlers/logout.handler';
import { RefreshTokenHandler } from './handlers/refresh-token.handler';
import { ValidateTokenHandler } from './handlers/validate-token.handler';

export const COMMAND_HANDLERS = [
  RegisterUserHandler,
  LoginHandler,
  LogoutHandler,
  RefreshTokenHandler,
];

export const QUERY_HANDLERS = [ValidateTokenHandler];

@Module({
  imports: [
    CqrsModule,
    AuthDatabaseModule,
    RedisModule,
    RabbitmqModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<number>('JWT_EXPIRES_IN') ?? 900 },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [...COMMAND_HANDLERS, ...QUERY_HANDLERS],
  exports: [CqrsModule, JwtModule],
})
export class AuthApplicationModule {}

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggingModule, ErrorsModule, MessagingModule, AuthModule } from '@user-management/shared';
import { UserCredentialsOrmEntity } from './infrastructure/persistence/entities/user-credentials.orm-entity';
import { TypeOrmUserCredentialsRepository } from './infrastructure/persistence/repositories/typeorm-user-credentials.repository';
import { USER_CREDENTIALS_REPOSITORY } from './domain/repositories/user-credentials.repository';
import { PasswordService } from './infrastructure/services/password.service';
import { JwtTokenService } from './infrastructure/services/jwt-token.service';
import { RoleServiceClient } from './infrastructure/http-clients/role-service.client';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { CreateCredentialsUseCase } from './application/use-cases/create-credentials.use-case';
import { AuthController } from './presentation/controllers/auth.controller';
import { InternalController } from './presentation/controllers/internal.controller';
import { HealthController } from './presentation/controllers/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    LoggingModule.forRoot({ serviceName: 'auth-service' }),
    ErrorsModule,
    MessagingModule,
    AuthModule,
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60000, // 1 minute window
        limit: 5, // max 5 requests per minute per IP
      },
    ]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('POSTGRES_HOST', 'localhost'),
        port: config.get<number>('POSTGRES_PORT', 5432),
        username: config.get<string>('POSTGRES_USER', 'admin'),
        password: config.get<string>('POSTGRES_PASSWORD', 'admin123'),
        database: config.get<string>('POSTGRES_DB', 'user_management'),
        schema: 'auth',
        entities: [UserCredentialsOrmEntity],
        synchronize: false,
        logging: config.get<string>('NODE_ENV') === 'development',
      }),
    }),
    TypeOrmModule.forFeature([UserCredentialsOrmEntity]),
  ],
  controllers: [AuthController, InternalController, HealthController],
  providers: [
    {
      provide: USER_CREDENTIALS_REPOSITORY,
      useClass: TypeOrmUserCredentialsRepository,
    },
    PasswordService,
    JwtTokenService,
    RoleServiceClient,
    LoginUseCase,
    CreateCredentialsUseCase,
  ],
  exports: [USER_CREDENTIALS_REPOSITORY],
})
export class AppModule {}

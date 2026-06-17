import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggingModule, ErrorsModule, MessagingModule, AuthModule } from '@user-management/shared';
import { RoleOrmEntity } from './infrastructure/persistence/entities/role.orm-entity';
import { UserRoleOrmEntity } from './infrastructure/persistence/entities/user-role.orm-entity';
import { TypeOrmRoleRepository } from './infrastructure/persistence/repositories/typeorm-role.repository';
import { TypeOrmUserRoleRepository } from './infrastructure/persistence/repositories/typeorm-user-role.repository';
import { ROLE_REPOSITORY } from './domain/repositories/role.repository';
import { USER_ROLE_REPOSITORY } from './domain/repositories/user-role.repository';
import { RedisCacheService } from './infrastructure/cache/redis-cache.service';
import { UserServiceClient } from './infrastructure/http-clients/user-service.client';
import { CreateRoleUseCase } from './application/use-cases/create-role.use-case';
import { ListRolesUseCase } from './application/use-cases/list-roles.use-case';
import { GetRoleUseCase } from './application/use-cases/get-role.use-case';
import { DeleteRoleUseCase } from './application/use-cases/delete-role.use-case';
import { AssignRoleUseCase } from './application/use-cases/assign-role.use-case';
import { UnassignRoleUseCase } from './application/use-cases/unassign-role.use-case';
import { GetUserRolesUseCase } from './application/use-cases/get-user-roles.use-case';
import { RolesController } from './presentation/controllers/roles.controller';
import { HealthController } from './presentation/controllers/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    LoggingModule.forRoot({ serviceName: 'role-service' }),
    ErrorsModule,
    MessagingModule,
    AuthModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('POSTGRES_HOST', 'localhost'),
        port: config.get<number>('POSTGRES_PORT', 5432),
        username: config.get<string>('POSTGRES_USER', 'admin'),
        password: config.get<string>('POSTGRES_PASSWORD', 'admin123'),
        database: config.get<string>('POSTGRES_DB', 'user_management'),
        schema: 'roles',
        entities: [RoleOrmEntity, UserRoleOrmEntity],
        synchronize: false,
        logging: config.get<string>('NODE_ENV') === 'development',
      }),
    }),
    TypeOrmModule.forFeature([RoleOrmEntity, UserRoleOrmEntity]),
  ],
  controllers: [RolesController, HealthController],
  providers: [
    {
      provide: ROLE_REPOSITORY,
      useClass: TypeOrmRoleRepository,
    },
    {
      provide: USER_ROLE_REPOSITORY,
      useClass: TypeOrmUserRoleRepository,
    },
    RedisCacheService,
    UserServiceClient,
    CreateRoleUseCase,
    ListRolesUseCase,
    GetRoleUseCase,
    DeleteRoleUseCase,
    AssignRoleUseCase,
    UnassignRoleUseCase,
    GetUserRolesUseCase,
  ],
  exports: [ROLE_REPOSITORY, USER_ROLE_REPOSITORY],
})
export class AppModule {}

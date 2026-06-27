import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleTypeormEntity } from './entities/role.typeorm-entity';
import { RoleTypeormRepository } from './repositories/role.typeorm-repository';
import { ROLE_REPOSITORY } from '../../../domain/repositories/role.repository.interface';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        entities: [RoleTypeormEntity],
        synchronize: config.get<string>('NODE_ENV') === 'development',
      }),
    }),
    TypeOrmModule.forFeature([RoleTypeormEntity]),
  ],
  providers: [
    RoleTypeormRepository,
    { provide: ROLE_REPOSITORY, useClass: RoleTypeormRepository },
  ],
  exports: [ROLE_REPOSITORY, TypeOrmModule],
})
export class RoleDatabaseModule {}

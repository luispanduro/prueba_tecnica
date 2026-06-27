import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserTypeormEntity } from './entities/user.typeorm-entity';
import { UserTypeormRepository } from './repositories/user.typeorm-repository';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface';

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
        entities: [UserTypeormEntity],
        synchronize: config.get<string>('NODE_ENV') === 'development',
      }),
    }),
    TypeOrmModule.forFeature([UserTypeormEntity]),
  ],
  providers: [
    UserTypeormRepository,
    { provide: USER_REPOSITORY, useClass: UserTypeormRepository },
  ],
  exports: [USER_REPOSITORY, TypeOrmModule],
})
export class UserDatabaseModule {}

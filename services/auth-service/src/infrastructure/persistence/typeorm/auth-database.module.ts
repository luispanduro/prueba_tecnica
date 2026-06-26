import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserCredentialsTypeormEntity } from './entities/user-credentials.typeorm-entity';
import { CredentialsTypeormRepository } from './repositories/credentials.typeorm-repository';
import { CREDENTIALS_REPOSITORY } from '../../../domain/repositories/credentials.repository.interface';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        database: config.get<string>('DB_NAME'),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASSWORD'),
        entities: [UserCredentialsTypeormEntity],
        synchronize: config.get<string>('NODE_ENV') === 'development',
        logging: false,
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([UserCredentialsTypeormEntity]),
  ],
  providers: [
    {
      provide: CREDENTIALS_REPOSITORY,
      useClass: CredentialsTypeormRepository,
    },
  ],
  exports: [CREDENTIALS_REPOSITORY],
})
export class AuthDatabaseModule {}

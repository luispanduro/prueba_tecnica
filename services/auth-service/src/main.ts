import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { AppModule } from './app.module';
import { seedAdminUser } from './infrastructure/seeds/admin.seed';
import {
  CREDENTIALS_REPOSITORY,
  ICredentialsRepository,
} from './domain/repositories/credentials.repository.interface';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format((info) => ({
              ...info,
              service: 'auth-service',
            }))(),
            winston.format.json(),
          ),
        }),
      ],
    }),
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT') ?? 3001;

  const credentialsRepo = app.get<ICredentialsRepository>(CREDENTIALS_REPOSITORY);
  await seedAdminUser(credentialsRepo, config);

  await app.listen(port);
}

bootstrap();

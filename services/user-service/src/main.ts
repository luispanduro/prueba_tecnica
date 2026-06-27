import { NestFactory } from '@nestjs/core';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import axios from 'axios';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { UserTypeormEntity } from './infrastructure/persistence/typeorm/entities/user.typeorm-entity';
import { v4 as uuidv4 } from 'uuid';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format((info) => ({
              ...info,
              service: 'user-service',
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
  const port = config.get<number>('PORT') ?? 3002;

  await app.listen(port);

  await seedAdminUser(app, config);
}

async function seedAdminUser(app: INestApplication, config: ConfigService): Promise<void> {
  const adminEmail = config.get<string>('SEED_ADMIN_EMAIL') ?? 'admin@toka.com';
  const roleServiceUrl = config.get<string>('ROLE_SERVICE_URL') ?? 'http://role-service:3003';

  try {
    const dataSource = app.get<DataSource>(getDataSourceToken());
    const userRepo = dataSource.getRepository(UserTypeormEntity);

    const existing = await userRepo.findOne({ where: { email: adminEmail } });
    if (existing) {
      return;
    }

    const rolesResp = await axios.get<{ id: string; name: string; permissions: string[] }[]>(
      `${roleServiceUrl}/internal/roles`,
      { timeout: 5000 },
    );
    const superAdmin = rolesResp.data.find((r) => r.name === 'SUPER_ADMIN');
    if (!superAdmin) return;

    await userRepo.save({
      id: uuidv4(),
      firstName: 'Admin',
      lastName: 'Toka',
      email: adminEmail,
      status: 'ACTIVE',
      roleIds: [superAdmin.id],
    });
  } catch {
    // seed failure is non-fatal
  }
}

bootstrap();

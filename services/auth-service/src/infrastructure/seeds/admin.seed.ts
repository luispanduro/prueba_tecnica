import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { ICredentialsRepository } from '../../domain/repositories/credentials.repository.interface';
import { UserCredentials } from '../../domain/entities/user-credentials.entity';
import { Email } from '../../domain/value-objects/email.vo';
import { PasswordHash } from '../../domain/value-objects/password-hash.vo';

const logger = new Logger('AdminSeed');

export async function seedAdminUser(
  credentialsRepo: ICredentialsRepository,
  config: ConfigService,
): Promise<void> {
  const adminEmail = config.get<string>('SEED_ADMIN_EMAIL') ?? 'admin@toka.com';
  const adminPassword = config.get<string>('SEED_ADMIN_PASSWORD') ?? 'Admin1234!';

  const email = Email.create(adminEmail);
  const existing = await credentialsRepo.findByEmail(email);

  if (existing) {
    logger.log({ action: 'seed.admin.exists', email: adminEmail });
    return;
  }

  const passwordHash = await PasswordHash.create(adminPassword);
  const credentials = UserCredentials.create(uuidv4(), email, passwordHash);
  await credentialsRepo.save(credentials);

  logger.log({ action: 'seed.admin.created', email: adminEmail });
}

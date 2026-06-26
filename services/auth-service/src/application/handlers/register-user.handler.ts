import { ConflictException, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { v4 as uuidv4 } from 'uuid';
import { UserCredentials } from '../../domain/entities/user-credentials.entity';
import { Email } from '../../domain/value-objects/email.vo';
import { PasswordHash } from '../../domain/value-objects/password-hash.vo';
import {
  CREDENTIALS_REPOSITORY,
  ICredentialsRepository,
} from '../../domain/repositories/credentials.repository.interface';
import { RabbitmqEventPublisher } from '../../infrastructure/messaging/rabbitmq/event-publisher';
import { RegisterUserCommand } from '../commands/register-user.command';

@CommandHandler(RegisterUserCommand)
export class RegisterUserHandler
  implements ICommandHandler<RegisterUserCommand>
{
  constructor(
    @Inject(CREDENTIALS_REPOSITORY)
    private readonly credentialsRepo: ICredentialsRepository,
    private readonly eventPublisher: RabbitmqEventPublisher,
  ) {}

  async execute(
    command: RegisterUserCommand,
  ): Promise<{ userId: string; email: string }> {
    const email = Email.create(command.email);

    const existing = await this.credentialsRepo.findByEmail(email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await PasswordHash.create(command.password);
    const userId = uuidv4();
    const credentials = UserCredentials.create(userId, email, passwordHash);

    await this.credentialsRepo.save(credentials);

    await this.eventPublisher.publish('auth.user.registered', {
      eventId: uuidv4(),
      eventType: 'auth.user.registered',
      aggregateId: userId,
      aggregateType: 'UserCredentials',
      occurredAt: new Date().toISOString(),
      correlationId: command.correlationId ?? uuidv4(),
      payload: { userId, email: email.getValue() },
      version: 1,
    });

    return { userId, email: email.getValue() };
  }
}

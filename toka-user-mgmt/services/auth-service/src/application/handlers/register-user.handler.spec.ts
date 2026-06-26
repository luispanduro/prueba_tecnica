import { ConflictException } from '@nestjs/common';
import { RegisterUserHandler } from './register-user.handler';
import { RegisterUserCommand } from '../commands/register-user.command';
import { ICredentialsRepository } from '../../domain/repositories/credentials.repository.interface';
import { RabbitmqEventPublisher } from '../../infrastructure/messaging/rabbitmq/event-publisher';
import { InvalidEmailException } from '../../domain/exceptions/invalid-email.exception';
import { UserCredentials } from '../../domain/entities/user-credentials.entity';
import { Email } from '../../domain/value-objects/email.vo';
import { PasswordHash } from '../../domain/value-objects/password-hash.vo';

jest.mock('uuid', () => ({ v4: jest.fn(() => 'mock-uuid-1234') }));
jest.setTimeout(30000);

const makeCredentials = (): UserCredentials =>
  UserCredentials.reconstitute(
    'existing-id',
    Email.create('taken@example.com'),
    PasswordHash.fromHash('$2b$12$fakehash'),
    true,
    new Date(),
    new Date(),
  );

describe('RegisterUserHandler', () => {
  let handler: RegisterUserHandler;
  let credentialsRepo: jest.Mocked<ICredentialsRepository>;
  let eventPublisher: jest.Mocked<RabbitmqEventPublisher>;

  beforeEach(() => {
    credentialsRepo = {
      findByEmail: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn(),
    } as unknown as jest.Mocked<ICredentialsRepository>;

    eventPublisher = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<RabbitmqEventPublisher>;

    handler = new RegisterUserHandler(credentialsRepo, eventPublisher);
  });

  describe('execute()', () => {
    it('registra usuario y publica evento auth.user.registered', async () => {
      credentialsRepo.findByEmail.mockResolvedValue(null);

      const result = await handler.execute(
        new RegisterUserCommand('new@example.com', 'Password1'),
      );

      expect(credentialsRepo.save).toHaveBeenCalledTimes(1);
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        'auth.user.registered',
        expect.objectContaining({
          eventType: 'auth.user.registered',
          payload: expect.objectContaining({ email: 'new@example.com' }),
        }),
      );
      expect(result.email).toBe('new@example.com');
      expect(result.userId).toBe('mock-uuid-1234');
    });

    it('lanza ConflictException si el email ya existe, sin guardar ni publicar', async () => {
      credentialsRepo.findByEmail.mockResolvedValue(makeCredentials());

      await expect(
        handler.execute(new RegisterUserCommand('taken@example.com', 'Password1')),
      ).rejects.toThrow(ConflictException);

      expect(credentialsRepo.save).not.toHaveBeenCalled();
      expect(eventPublisher.publish).not.toHaveBeenCalled();
    });

    it('lanza InvalidEmailException con email inválido', async () => {
      await expect(
        handler.execute(new RegisterUserCommand('not-an-email', 'Password1')),
      ).rejects.toThrow(InvalidEmailException);

      expect(credentialsRepo.save).not.toHaveBeenCalled();
    });

    it('normaliza el email a lowercase en el resultado', async () => {
      credentialsRepo.findByEmail.mockResolvedValue(null);

      const result = await handler.execute(
        new RegisterUserCommand('USER@EXAMPLE.COM', 'Password1'),
      );

      expect(result.email).toBe('user@example.com');
    });
  });
});

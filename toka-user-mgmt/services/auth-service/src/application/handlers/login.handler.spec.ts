import { LoginHandler } from './login.handler';
import { LoginCommand } from '../commands/login.command';
import { ICredentialsRepository } from '../../domain/repositories/credentials.repository.interface';
import { InvalidCredentialsException } from '../../domain/exceptions/invalid-credentials.exception';
import { AccountInactiveException } from '../../domain/exceptions/account-inactive.exception';
import { TokenRedisRepository } from '../../infrastructure/persistence/redis/token.redis-repository';
import { RabbitmqEventPublisher } from '../../infrastructure/messaging/rabbitmq/event-publisher';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserCredentials } from '../../domain/entities/user-credentials.entity';
import { Email } from '../../domain/value-objects/email.vo';
import { PasswordHash } from '../../domain/value-objects/password-hash.vo';

jest.mock('uuid', () => ({ v4: jest.fn(() => 'mock-uuid') }));

const LOGIN_CMD = new LoginCommand('user@example.com', 'Password1', '127.0.0.1', 'test-agent');

const makeMockCredentials = (isActive = true, passwordValid = true): UserCredentials => {
  const creds = UserCredentials.reconstitute(
    'user-uuid',
    Email.create('user@example.com'),
    PasswordHash.fromHash('$2b$12$fakehash'),
    isActive,
    new Date(),
    new Date(),
  );
  jest.spyOn(creds, 'verifyPassword').mockResolvedValue(passwordValid);
  return creds;
};

describe('LoginHandler', () => {
  let handler: LoginHandler;
  let credentialsRepo: jest.Mocked<ICredentialsRepository>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let tokenRepo: jest.Mocked<TokenRedisRepository>;
  let eventPublisher: jest.Mocked<RabbitmqEventPublisher>;

  beforeEach(() => {
    credentialsRepo = {
      findByEmail: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<ICredentialsRepository>;

    jwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    } as unknown as jest.Mocked<JwtService>;

    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'JWT_EXPIRES_IN') return 900;
        if (key === 'REFRESH_TOKEN_TTL') return 604800;
        return undefined;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    tokenRepo = {
      saveRefreshToken: jest.fn().mockResolvedValue(undefined),
      validateRefreshToken: jest.fn(),
      deleteRefreshToken: jest.fn(),
      blacklistToken: jest.fn(),
      isTokenBlacklisted: jest.fn(),
      cachePermissions: jest.fn(),
      getCachedPermissions: jest.fn(),
    } as unknown as jest.Mocked<TokenRedisRepository>;

    eventPublisher = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<RabbitmqEventPublisher>;

    handler = new LoginHandler(credentialsRepo, jwtService, configService, tokenRepo, eventPublisher);
  });

  describe('execute()', () => {
    it('retorna accessToken, refreshToken y expiresIn en caso exitoso', async () => {
      credentialsRepo.findByEmail.mockResolvedValue(makeMockCredentials());

      const result = await handler.execute(LOGIN_CMD);

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.refreshToken).toBe('mock-jwt-token');
      expect(result.expiresIn).toBe(900);
    });

    it('guarda el refresh token en Redis con TTL correcto', async () => {
      credentialsRepo.findByEmail.mockResolvedValue(makeMockCredentials());

      await handler.execute(LOGIN_CMD);

      expect(tokenRepo.saveRefreshToken).toHaveBeenCalledWith('user-uuid', 'mock-uuid', 604800);
    });

    it('publica auth.user.login.success en caso exitoso', async () => {
      credentialsRepo.findByEmail.mockResolvedValue(makeMockCredentials());

      await handler.execute(LOGIN_CMD);

      expect(eventPublisher.publish).toHaveBeenCalledWith(
        'auth.user.login.success',
        expect.objectContaining({ eventType: 'auth.user.login.success' }),
      );
    });

    it('el access token lleva jti en el payload', async () => {
      credentialsRepo.findByEmail.mockResolvedValue(makeMockCredentials());

      await handler.execute(LOGIN_CMD);

      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ jti: 'mock-uuid' }),
        expect.any(Object),
      );
    });

    it('publica fallo y lanza InvalidCredentialsException si usuario no existe', async () => {
      credentialsRepo.findByEmail.mockResolvedValue(null);

      await expect(handler.execute(LOGIN_CMD)).rejects.toThrow(InvalidCredentialsException);

      expect(eventPublisher.publish).toHaveBeenCalledWith(
        'auth.user.login.failed',
        expect.objectContaining({ payload: expect.objectContaining({ reason: 'invalid_credentials' }) }),
      );
      expect(tokenRepo.saveRefreshToken).not.toHaveBeenCalled();
    });

    it('publica fallo con account_inactive y lanza AccountInactiveException', async () => {
      credentialsRepo.findByEmail.mockResolvedValue(makeMockCredentials(false));

      await expect(handler.execute(LOGIN_CMD)).rejects.toThrow(AccountInactiveException);

      expect(eventPublisher.publish).toHaveBeenCalledWith(
        'auth.user.login.failed',
        expect.objectContaining({ payload: expect.objectContaining({ reason: 'account_inactive' }) }),
      );
    });

    it('publica fallo y lanza InvalidCredentialsException si password es incorrecto', async () => {
      credentialsRepo.findByEmail.mockResolvedValue(makeMockCredentials(true, false));

      await expect(handler.execute(LOGIN_CMD)).rejects.toThrow(InvalidCredentialsException);

      expect(eventPublisher.publish).toHaveBeenCalledWith(
        'auth.user.login.failed',
        expect.objectContaining({ payload: expect.objectContaining({ reason: 'invalid_credentials' }) }),
      );
    });
  });
});

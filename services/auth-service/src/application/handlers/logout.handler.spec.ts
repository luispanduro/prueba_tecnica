import { LogoutHandler } from './logout.handler';
import { LogoutCommand } from '../commands/logout.command';
import { TokenRedisRepository } from '../../infrastructure/persistence/redis/token.redis-repository';
import { RabbitmqEventPublisher } from '../../infrastructure/messaging/rabbitmq/event-publisher';
import { ConfigService } from '@nestjs/config';

jest.mock('uuid', () => ({ v4: jest.fn(() => 'mock-uuid') }));

const LOGOUT_CMD = new LogoutCommand('user-uuid', 'jti-abc', 'token-id-xyz', 'corr-id-123');

describe('LogoutHandler', () => {
  let handler: LogoutHandler;
  let tokenRepo: jest.Mocked<TokenRedisRepository>;
  let configService: jest.Mocked<ConfigService>;
  let eventPublisher: jest.Mocked<RabbitmqEventPublisher>;

  beforeEach(() => {
    tokenRepo = {
      blacklistToken: jest.fn().mockResolvedValue(undefined),
      deleteRefreshToken: jest.fn().mockResolvedValue(undefined),
      saveRefreshToken: jest.fn(),
      validateRefreshToken: jest.fn(),
      isTokenBlacklisted: jest.fn(),
      cachePermissions: jest.fn(),
      getCachedPermissions: jest.fn(),
    } as unknown as jest.Mocked<TokenRedisRepository>;

    configService = {
      get: jest.fn().mockReturnValue(900),
    } as unknown as jest.Mocked<ConfigService>;

    eventPublisher = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<RabbitmqEventPublisher>;

    handler = new LogoutHandler(tokenRepo, configService, eventPublisher);
  });

  describe('execute()', () => {
    it('blacklistea el jti con TTL igual a JWT_EXPIRES_IN', async () => {
      await handler.execute(LOGOUT_CMD);
      expect(tokenRepo.blacklistToken).toHaveBeenCalledWith('jti-abc', 900);
    });

    it('elimina el refresh token de Redis', async () => {
      await handler.execute(LOGOUT_CMD);
      expect(tokenRepo.deleteRefreshToken).toHaveBeenCalledWith('user-uuid', 'token-id-xyz');
    });

    it('publica evento auth.user.logout con los campos correctos', async () => {
      await handler.execute(LOGOUT_CMD);

      expect(eventPublisher.publish).toHaveBeenCalledWith(
        'auth.user.logout',
        expect.objectContaining({
          eventType: 'auth.user.logout',
          aggregateId: 'user-uuid',
          correlationId: 'corr-id-123',
          payload: { userId: 'user-uuid' },
        }),
      );
    });

    it('blacklistea ANTES de eliminar el refresh token', async () => {
      const order: string[] = [];
      tokenRepo.blacklistToken.mockImplementation(async () => { order.push('blacklist'); });
      tokenRepo.deleteRefreshToken.mockImplementation(async () => { order.push('delete'); });

      await handler.execute(LOGOUT_CMD);

      expect(order).toEqual(['blacklist', 'delete']);
    });
  });
});

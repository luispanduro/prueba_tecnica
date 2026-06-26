import { UnauthorizedException } from '@nestjs/common';
import { RefreshTokenHandler } from './refresh-token.handler';
import { RefreshTokenCommand } from '../commands/refresh-token.command';
import { TokenRedisRepository } from '../../infrastructure/persistence/redis/token.redis-repository';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

jest.mock('uuid', () => ({ v4: jest.fn(() => 'new-mock-uuid') }));

describe('RefreshTokenHandler', () => {
  let handler: RefreshTokenHandler;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let tokenRepo: jest.Mocked<TokenRedisRepository>;

  beforeEach(() => {
    jwtService = {
      verify: jest.fn(),
      sign: jest.fn().mockReturnValue('new-jwt-token'),
    } as unknown as jest.Mocked<JwtService>;

    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'JWT_EXPIRES_IN') return 900;
        if (key === 'REFRESH_TOKEN_TTL') return 604800;
        return undefined;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    tokenRepo = {
      validateRefreshToken: jest.fn().mockResolvedValue(true),
      deleteRefreshToken: jest.fn().mockResolvedValue(undefined),
      saveRefreshToken: jest.fn().mockResolvedValue(undefined),
      blacklistToken: jest.fn(),
      isTokenBlacklisted: jest.fn(),
      cachePermissions: jest.fn(),
      getCachedPermissions: jest.fn(),
    } as unknown as jest.Mocked<TokenRedisRepository>;

    handler = new RefreshTokenHandler(jwtService, configService, tokenRepo);
  });

  describe('execute()', () => {
    it('retorna nuevos tokens cuando el refresh token es válido', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-id', tokenId: 'old-token-id' });

      const result = await handler.execute(new RefreshTokenCommand('valid-refresh-token'));

      expect(result.accessToken).toBe('new-jwt-token');
      expect(result.refreshToken).toBe('new-jwt-token');
      expect(result.expiresIn).toBe(900);
    });

    it('elimina el token antiguo de Redis', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-id', tokenId: 'old-token-id' });

      await handler.execute(new RefreshTokenCommand('valid-refresh-token'));

      expect(tokenRepo.deleteRefreshToken).toHaveBeenCalledWith('user-id', 'old-token-id');
    });

    it('guarda el nuevo refresh token en Redis', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-id', tokenId: 'old-token-id' });

      await handler.execute(new RefreshTokenCommand('valid-refresh-token'));

      expect(tokenRepo.saveRefreshToken).toHaveBeenCalledWith('user-id', 'new-mock-uuid', 604800);
    });

    it('lanza UnauthorizedException si la firma JWT es inválida', async () => {
      jwtService.verify.mockImplementation(() => { throw new Error('invalid signature'); });

      await expect(
        handler.execute(new RefreshTokenCommand('bad-token')),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lanza UnauthorizedException si el token no existe en Redis', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-id', tokenId: 'revoked-id' });
      tokenRepo.validateRefreshToken.mockResolvedValue(false);

      await expect(
        handler.execute(new RefreshTokenCommand('valid-refresh-token')),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});

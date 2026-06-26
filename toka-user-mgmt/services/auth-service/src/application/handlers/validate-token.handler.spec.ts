import { UnauthorizedException } from '@nestjs/common';
import { ValidateTokenHandler } from './validate-token.handler';
import { ValidateTokenQuery } from '../queries/validate-token.query';
import { TokenRedisRepository } from '../../infrastructure/persistence/redis/token.redis-repository';
import { JwtService } from '@nestjs/jwt';

const MOCK_PAYLOAD = {
  sub: 'user-id',
  email: 'user@example.com',
  roles: ['USER'],
  permissions: ['users:read'],
  jti: 'jti-abc',
  iat: 1000000,
  exp: 1000900,
};

describe('ValidateTokenHandler', () => {
  let handler: ValidateTokenHandler;
  let jwtService: jest.Mocked<JwtService>;
  let tokenRepo: jest.Mocked<TokenRedisRepository>;

  beforeEach(() => {
    jwtService = {
      verify: jest.fn().mockReturnValue(MOCK_PAYLOAD),
    } as unknown as jest.Mocked<JwtService>;

    tokenRepo = {
      isTokenBlacklisted: jest.fn().mockResolvedValue(false),
      blacklistToken: jest.fn(),
      saveRefreshToken: jest.fn(),
      validateRefreshToken: jest.fn(),
      deleteRefreshToken: jest.fn(),
      cachePermissions: jest.fn(),
      getCachedPermissions: jest.fn(),
    } as unknown as jest.Mocked<TokenRedisRepository>;

    handler = new ValidateTokenHandler(jwtService, tokenRepo);
  });

  describe('execute()', () => {
    it('retorna el payload decodificado cuando el token es válido', async () => {
      const result = await handler.execute(new ValidateTokenQuery('valid-token'));

      expect(result.sub).toBe('user-id');
      expect(result.email).toBe('user@example.com');
      expect(result.jti).toBe('jti-abc');
    });

    it('lanza UnauthorizedException si la firma JWT es inválida', async () => {
      jwtService.verify.mockImplementation(() => { throw new Error('jwt expired'); });

      await expect(
        handler.execute(new ValidateTokenQuery('expired-token')),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lanza UnauthorizedException si el jti está en la blacklist', async () => {
      tokenRepo.isTokenBlacklisted.mockResolvedValue(true);

      await expect(
        handler.execute(new ValidateTokenQuery('blacklisted-token')),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('verifica la blacklist con el jti del payload', async () => {
      await handler.execute(new ValidateTokenQuery('valid-token'));

      expect(tokenRepo.isTokenBlacklisted).toHaveBeenCalledWith('jti-abc');
    });
  });
});

import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

@Injectable()
export class TokenRedisRepository {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async saveRefreshToken(
    userId: string,
    tokenId: string,
    ttlSeconds: number,
  ): Promise<void> {
    await this.redis.set(
      `refresh_token:${userId}:${tokenId}`,
      '1',
      'EX',
      ttlSeconds,
    );
  }

  async validateRefreshToken(
    userId: string,
    tokenId: string,
  ): Promise<boolean> {
    const exists = await this.redis.exists(
      `refresh_token:${userId}:${tokenId}`,
    );
    return exists === 1;
  }

  async deleteRefreshToken(userId: string, tokenId: string): Promise<void> {
    await this.redis.del(`refresh_token:${userId}:${tokenId}`);
  }

  async blacklistToken(jti: string, ttlSeconds: number): Promise<void> {
    await this.redis.set(`token_blacklist:${jti}`, '1', 'EX', ttlSeconds);
  }

  async isTokenBlacklisted(jti: string): Promise<boolean> {
    const exists = await this.redis.exists(`token_blacklist:${jti}`);
    return exists === 1;
  }

  async cachePermissions(
    userId: string,
    permissions: string[],
    ttlSeconds: number,
  ): Promise<void> {
    await this.redis.set(
      `permissions_cache:${userId}`,
      JSON.stringify(permissions),
      'EX',
      ttlSeconds,
    );
  }

  async getCachedPermissions(userId: string): Promise<string[] | null> {
    const raw = await this.redis.get(`permissions_cache:${userId}`);
    if (!raw) return null;
    return JSON.parse(raw) as string[];
  }
}

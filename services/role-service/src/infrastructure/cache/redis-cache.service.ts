import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { LoggerService } from '@user-management/shared';

@Injectable()
export class RedisCacheService implements OnModuleInit, OnModuleDestroy {
  private client: Redis | null = null;
  private isConnected = false;
  private readonly TTL_SECONDS = 300; // 5 minutes

  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      const redisUrl = this.config.get<string>('REDIS_URL', 'redis://localhost:6379');
      this.client = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
      });

      await this.client.connect();
      this.isConnected = true;
      this.logger.info('Connected to Redis');
    } catch (error) {
      this.isConnected = false;
      this.logger.warn('Redis not available, operating without cache', {
        error: error instanceof Error ? error.message : 'unknown',
      });
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit();
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected || !this.client) return null;
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      this.logger.warn('Redis GET failed', {
        key,
        error: error instanceof Error ? error.message : 'unknown',
      });
      return null;
    }
  }

  async set(key: string, value: unknown): Promise<void> {
    if (!this.isConnected || !this.client) return;
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', this.TTL_SECONDS);
    } catch (error) {
      this.logger.warn('Redis SET failed', {
        key,
        error: error instanceof Error ? error.message : 'unknown',
      });
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isConnected || !this.client) return;
    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.warn('Redis DEL failed', {
        key,
        error: error instanceof Error ? error.message : 'unknown',
      });
    }
  }

  isAvailable(): boolean {
    return this.isConnected;
  }
}

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { TokenRedisRepository } from './token.redis-repository';

import { REDIS_CLIENT } from './redis.constants';
export { REDIS_CLIENT };

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (config: ConfigService): Redis => {
        return new Redis({
          host: config.get<string>('REDIS_HOST'),
          port: config.get<number>('REDIS_PORT'),
          password: config.get<string>('REDIS_PASSWORD'),
          lazyConnect: true,
        });
      },
      inject: [ConfigService],
    },
    TokenRedisRepository,
  ],
  exports: [TokenRedisRepository, REDIS_CLIENT],
})
export class RedisModule {}

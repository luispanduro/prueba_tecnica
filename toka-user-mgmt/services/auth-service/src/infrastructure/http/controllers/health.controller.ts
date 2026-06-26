import { Controller, Get, Inject } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';
import { AmqpConnectionManager } from 'amqp-connection-manager';
import { REDIS_CLIENT } from '../../persistence/redis/redis.module';
import { RABBITMQ_CLIENT } from '../../messaging/rabbitmq/rabbitmq.module';

type DependencyStatus = 'ok' | 'down';
type ServiceStatus = 'ok' | 'degraded' | 'down';

interface HealthResponse {
  status: ServiceStatus;
  service: string;
  timestamp: string;
  dependencies: {
    database: DependencyStatus;
    redis: DependencyStatus;
    rabbitmq: DependencyStatus;
  };
}

@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(RABBITMQ_CLIENT) private readonly amqp: AmqpConnectionManager,
  ) {}

  @Get()
  async check(): Promise<HealthResponse> {
    const [database, redis, rabbitmq] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkRabbitmq(),
    ]);

    const deps = { database, redis, rabbitmq };
    const downCount = Object.values(deps).filter((s) => s === 'down').length;
    const status: ServiceStatus =
      downCount === 0 ? 'ok' : downCount < 3 ? 'degraded' : 'down';

    return {
      status,
      service: 'auth-service',
      timestamp: new Date().toISOString(),
      dependencies: deps,
    };
  }

  private async checkDatabase(): Promise<DependencyStatus> {
    try {
      await this.dataSource.query('SELECT 1');
      return 'ok';
    } catch {
      return 'down';
    }
  }

  private async checkRedis(): Promise<DependencyStatus> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG' ? 'ok' : 'down';
    } catch {
      return 'down';
    }
  }

  private async checkRabbitmq(): Promise<DependencyStatus> {
    try {
      return this.amqp.isConnected() ? 'ok' : 'down';
    } catch {
      return 'down';
    }
  }
}

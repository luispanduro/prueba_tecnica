import { Controller, Get, Inject } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RABBITMQ_CLIENT } from '../../messaging/rabbitmq/rabbitmq.module';

@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(RABBITMQ_CLIENT) private readonly amqp: ReturnType<typeof import('amqp-connection-manager').connect>,
  ) {}

  @Get()
  async check() {
    const deps: Record<string, string> = {};

    try {
      await this.dataSource.query('SELECT 1');
      deps['postgres'] = 'ok';
    } catch {
      deps['postgres'] = 'down';
    }

    deps['rabbitmq'] = this.amqp.isConnected() ? 'ok' : 'down';

    const allOk = Object.values(deps).every((v) => v === 'ok');
    return {
      status: allOk ? 'ok' : 'degraded',
      service: 'role-service',
      timestamp: new Date().toISOString(),
      dependencies: deps,
    };
  }
}

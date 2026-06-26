import { Controller, Get, Inject } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { RABBITMQ_CLIENT } from '../../messaging/rabbitmq.module';

@Controller('health')
export class HealthController {
  constructor(
    @InjectConnection() private readonly mongoConn: Connection,
    @Inject(RABBITMQ_CLIENT)
    private readonly amqp: ReturnType<
      typeof import('amqp-connection-manager').connect
    >,
  ) {}

  @Get()
  check() {
    const deps: Record<string, string> = {};
    deps['mongodb'] = this.mongoConn.readyState === 1 ? 'ok' : 'down';
    deps['rabbitmq'] = this.amqp.isConnected() ? 'ok' : 'down';

    const allOk = Object.values(deps).every((v) => v === 'ok');
    return {
      status: allOk ? 'ok' : 'degraded',
      service: 'audit-service',
      timestamp: new Date().toISOString(),
      dependencies: deps,
    };
  }
}

import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Controller('health')
export class HealthController {
  constructor(
    @InjectConnection()
    private readonly mongoConnection: Connection,
  ) {}

  @Get()
  async check() {
    const checks: Record<string, string> = {
      status: 'ok',
      service: 'audit-service',
      timestamp: new Date().toISOString(),
    };

    // Check MongoDB
    const mongoState = this.mongoConnection.readyState;
    if (mongoState === 1) {
      checks['mongodb'] = 'connected';
    } else {
      checks['mongodb'] = 'disconnected';
      checks['status'] = 'degraded';
    }

    return checks;
  }
}

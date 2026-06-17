import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  @Get()
  async check() {
    const checks: Record<string, string> = {
      status: 'ok',
      service: 'auth-service',
      timestamp: new Date().toISOString(),
    };

    // Check PostgreSQL connection
    try {
      if (this.dataSource.isInitialized) {
        await this.dataSource.query('SELECT 1');
        checks['database'] = 'connected';
      } else {
        checks['database'] = 'not_initialized';
      }
    } catch {
      checks['database'] = 'disconnected';
      checks['status'] = 'degraded';
    }

    // Check JWT configuration
    const jwtSecret = this.config.get<string>('JWT_SECRET');
    checks['jwt_configured'] = jwtSecret ? 'yes' : 'no';

    return checks;
  }
}

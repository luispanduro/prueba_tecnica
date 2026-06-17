import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { RedisCacheService } from '../../infrastructure/cache/redis-cache.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly cacheService: RedisCacheService,
  ) {}

  @Get()
  async check() {
    const checks: Record<string, string> = {
      status: 'ok',
      service: 'user-service',
      timestamp: new Date().toISOString(),
    };

    // Check PostgreSQL
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

    // Check JWT config
    const jwtSecret = this.config.get<string>('JWT_SECRET');
    checks['jwt_configured'] = jwtSecret ? 'yes' : 'no';

    // Check Redis
    checks['redis'] = this.cacheService.isAvailable() ? 'connected' : 'unavailable';
    if (!this.cacheService.isAvailable()) {
      checks['status'] = checks['status'] === 'ok' ? 'degraded' : checks['status'];
    }

    return checks;
  }
}

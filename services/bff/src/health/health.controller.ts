import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface ServiceHealth {
  status: 'ok' | 'unavailable';
}

interface HealthResponse {
  status: 'ok' | 'degraded';
  services: Record<string, ServiceHealth>;
}

@Controller('health')
export class HealthController {
  private readonly serviceUrls: Record<string, string>;

  constructor(private readonly config: ConfigService) {
    this.serviceUrls = {
      auth: config.get<string>('AUTH_SERVICE_URL')!,
      users: config.get<string>('USER_SERVICE_URL')!,
      roles: config.get<string>('ROLE_SERVICE_URL')!,
      audit: config.get<string>('AUDIT_SERVICE_URL')!,
      ai: config.get<string>('AI_SERVICE_URL')!,
    };
  }

  @Get()
  async health(): Promise<HealthResponse> {
    const checks = await Promise.allSettled(
      Object.entries(this.serviceUrls).map(async ([name, url]) => {
        const healthPath = name === 'ai' ? '/ai/health' : '/health';
        const timeout = name === 'ai' ? 8000 : 3000;
        await axios.get(`${url}${healthPath}`, { timeout });
        return name;
      }),
    );

    const services: Record<string, ServiceHealth> = {};
    let allOk = true;

    Object.keys(this.serviceUrls).forEach((name, i) => {
      const result = checks[i];
      const ok = result.status === 'fulfilled';
      if (!ok) allOk = false;
      services[name] = { status: ok ? 'ok' : 'unavailable' };
    });

    return { status: allOk ? 'ok' : 'degraded', services };
  }
}

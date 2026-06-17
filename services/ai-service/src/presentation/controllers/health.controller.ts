import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller('health')
export class HealthController {
  constructor(private readonly config: ConfigService) {}

  @Get()
  check() {
    const checks: Record<string, string> = {
      status: 'ok',
      service: 'ai-service',
      timestamp: new Date().toISOString(),
    };

    // Check OpenAI API key configured
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    checks['openai_configured'] = apiKey && apiKey !== 'sk-your-api-key-here' ? 'yes' : 'no';

    // Check Qdrant configured
    const qdrantUrl = this.config.get<string>('QDRANT_URL');
    checks['qdrant_configured'] = qdrantUrl ? 'yes' : 'no';

    // Check JWT configured
    const jwtSecret = this.config.get<string>('JWT_SECRET');
    checks['jwt_configured'] = jwtSecret ? 'yes' : 'no';

    if (!apiKey || apiKey === 'sk-your-api-key-here') {
      checks['status'] = 'degraded';
    }

    return checks;
  }
}

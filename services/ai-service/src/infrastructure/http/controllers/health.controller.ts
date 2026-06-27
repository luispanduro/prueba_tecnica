import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Controller('health')
export class AiHealthController {
  constructor(private readonly config: ConfigService) {}

  @Get()
  async health(): Promise<{ status: string; qdrant: string; openai: string }> {
    const qdrantUrl = this.config.get<string>('QDRANT_URL')!;
    const openAIApiKey = this.config.get<string>('OPENAI_API_KEY')!;

    let qdrantStatus = 'ok';
    try {
      await axios.get(`${qdrantUrl}/healthz`, { timeout: 3000 });
    } catch {
      qdrantStatus = 'unavailable';
    }

    let openaiStatus = 'ok';
    try {
      await axios.get('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${openAIApiKey}` },
        timeout: 5000,
      });
    } catch {
      openaiStatus = 'unavailable';
    }

    return {
      status: qdrantStatus === 'ok' && openaiStatus === 'ok' ? 'ok' : 'degraded',
      qdrant: qdrantStatus,
      openai: openaiStatus,
    };
  }
}

import { Controller, All, Req, Res, Body, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { ProxyService, HttpMethod } from './proxy.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('api/ai')
@UseGuards(JwtAuthGuard)
export class AiProxyController {
  private readonly aiServiceUrl: string;

  constructor(
    private readonly proxy: ProxyService,
    private readonly config: ConfigService,
  ) {
    this.aiServiceUrl = this.config.get<string>('AI_SERVICE_URL')!;
  }

  @All(['', '*'])
  async forward(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: unknown,
  ): Promise<void> {
    const subPath = req.path.replace(/^\/api\/ai/, '');
    const qs = req.url.includes('?') ? '?' + req.url.split('?').slice(1).join('?') : '';
    // AI_SERVICE_URL is http://ai-service:3004 — routes are at /ai/*
    const targetUrl = `${this.aiServiceUrl}/ai${subPath}${qs}`;

    const { data, status } = await this.proxy.forward(
      req.method as HttpMethod,
      targetUrl,
      req,
      body,
    );
    res.status(status).json(data);
  }
}

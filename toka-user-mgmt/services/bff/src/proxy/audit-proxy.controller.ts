import { Controller, All, Req, Res, Body, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { ProxyService, HttpMethod } from './proxy.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('api/audit')
@UseGuards(JwtAuthGuard)
export class AuditProxyController {
  private readonly auditServiceUrl: string;

  constructor(
    private readonly proxy: ProxyService,
    private readonly config: ConfigService,
  ) {
    this.auditServiceUrl = this.config.get<string>('AUDIT_SERVICE_URL')!;
  }

  @All(['', '*'])
  async forward(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: unknown,
  ): Promise<void> {
    const subPath = req.path.replace(/^\/api\/audit/, '');
    const qs = req.url.includes('?') ? '?' + req.url.split('?').slice(1).join('?') : '';
    const targetUrl = `${this.auditServiceUrl}/audit${subPath}${qs}`;

    const { data, status } = await this.proxy.forward(
      req.method as HttpMethod,
      targetUrl,
      req,
      body,
    );
    res.status(status).json(data);
  }
}

import { Controller, All, Req, Res, Body, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { ProxyService, HttpMethod } from './proxy.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

interface RequestWithUser extends Request {
  user: { sub: string; roles: string[]; permissions: string[] };
}

@Controller('api/users')
@UseGuards(JwtAuthGuard)
export class UsersProxyController {
  private readonly userServiceUrl: string;

  constructor(
    private readonly proxy: ProxyService,
    private readonly config: ConfigService,
  ) {
    this.userServiceUrl = this.config.get<string>('USER_SERVICE_URL')!;
  }

  @All(['', '*'])
  async forward(
    @Req() req: RequestWithUser,
    @Res() res: Response,
    @Body() body: unknown,
  ): Promise<void> {
    // Inject user context headers for downstream services
    if (req.user) {
      req.headers['x-user-id'] = req.user.sub;
      req.headers['x-user-roles'] = req.user.roles.join(',');
    }

    const subPath = req.path.replace(/^\/api\/users/, '');
    const qs = req.url.includes('?') ? '?' + req.url.split('?').slice(1).join('?') : '';
    const targetUrl = `${this.userServiceUrl}/users${subPath}${qs}`;

    const { data, status } = await this.proxy.forward(
      req.method as HttpMethod,
      targetUrl,
      req,
      body,
    );
    res.status(status).json(data);
  }
}

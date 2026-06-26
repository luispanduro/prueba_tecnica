import {
  Controller,
  Post,
  Req,
  Res,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { ProxyService } from './proxy.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('api/auth')
export class AuthProxyController {
  private readonly authUrl: string;

  constructor(
    private readonly proxy: ProxyService,
    private readonly config: ConfigService,
  ) {
    this.authUrl = this.config.get<string>('AUTH_SERVICE_URL')!;
  }

  @Post('register')
  async register(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: unknown,
  ): Promise<void> {
    const { data, status } = await this.proxy.forward(
      'POST',
      `${this.authUrl}/auth/register`,
      req,
      body,
    );
    res.status(status).json(data);
  }

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async login(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: unknown,
  ): Promise<void> {
    const { data, status } = await this.proxy.forward(
      'POST',
      `${this.authUrl}/auth/login`,
      req,
      body,
    );
    res.status(status).json(data);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: unknown,
  ): Promise<void> {
    const { data, status } = await this.proxy.forward(
      'POST',
      `${this.authUrl}/auth/logout`,
      req,
      body,
    );
    res.status(status).json(data);
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: unknown,
  ): Promise<void> {
    const { data, status } = await this.proxy.forward(
      'POST',
      `${this.authUrl}/auth/refresh`,
      req,
      body,
    );
    res.status(status).json(data);
  }
}

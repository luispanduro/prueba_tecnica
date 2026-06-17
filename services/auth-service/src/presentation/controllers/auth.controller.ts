import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { LoginUseCase, LoginOutput } from '../../application/use-cases/login.use-case';
import { LoginDto } from '../dtos/login.dto';
import { ValidateTokenDto } from '../dtos/validate-token.dto';
import { AuditPublisherService, ROUTING_KEYS, AuditEventMessage } from '@user-management/shared';

interface JwtPayloadDecoded {
  sub: string;
  username: string;
  roles: string[];
}

@Controller('auth')
export class AuthController {
  private readonly jwtSecret: string;

  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly config: ConfigService,
    private readonly auditPublisher: AuditPublisherService,
  ) {
    this.jwtSecret = this.config.get<string>('JWT_SECRET', 'local-development-secret');
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  async login(@Body() dto: LoginDto, @Req() req: Request): Promise<LoginOutput> {
    const result = await this.loginUseCase.execute({
      usernameOrEmail: dto.usernameOrEmail,
      password: dto.password,
    });

    // Publish audit event on successful login
    const correlationId =
      (req.headers['x-correlation-id'] as string) || '';

    const auditEvent: AuditEventMessage = {
      event_type: 'auth.login',
      actor_id: result.user.id,
      actor_username: result.user.username,
      resource_type: 'auth',
      resource_id: result.user.id,
      action: 'login',
      details: {},
      ip_address: req.ip || req.socket.remoteAddress || 'unknown',
      correlation_id: correlationId,
      timestamp: new Date().toISOString(),
      service_origin: 'auth-service',
    };

    await this.auditPublisher.publish(ROUTING_KEYS.AUTH_LOGIN, auditEvent);

    return result;
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validate(@Body() dto: ValidateTokenDto) {
    const token = dto.token;

    if (!token) {
      throw new UnauthorizedException('Token is required');
    }

    try {
      const payload = jwt.verify(token, this.jwtSecret) as JwtPayloadDecoded;

      return {
        valid: true,
        user: {
          user_id: payload.sub,
          username: payload.username,
          roles: payload.roles || [],
        },
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException('Token has expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedException('Invalid token');
      }
      throw new UnauthorizedException('Token validation failed');
    }
  }
}

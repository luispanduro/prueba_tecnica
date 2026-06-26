import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { RegisterUserCommand } from '../../../application/commands/register-user.command';
import { LoginCommand } from '../../../application/commands/login.command';
import { LogoutCommand } from '../../../application/commands/logout.command';
import { RefreshTokenCommand } from '../../../application/commands/refresh-token.command';
import { ValidateTokenQuery } from '../../../application/queries/validate-token.query';
import { RegisterDto } from '../dtos/register.dto';
import { LoginDto } from '../dtos/login.dto';
import { RefreshTokenDto } from '../dtos/refresh-token.dto';
import { LogoutDto } from '../dtos/logout.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    roles: string[];
    permissions: string[];
    jti: string;
  };
}

interface RefreshPayload {
  sub: string;
  tokenId: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly jwtService: JwtService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    const correlationId = req.headers['x-correlation-id'] as string | undefined;
    return this.commandBus.execute(
      new RegisterUserCommand(dto.email, dto.password, correlationId),
    );
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const correlationId = req.headers['x-correlation-id'] as string | undefined;
    const ip = req.ip ?? 'unknown';
    const userAgent = (req.headers['user-agent'] as string) ?? 'unknown';
    return this.commandBus.execute(
      new LoginCommand(dto.email, dto.password, ip, userAgent, correlationId),
    );
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async logout(
    @Body() dto: LogoutDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    const { userId, jti } = req.user;
    const correlationId = req.headers['x-correlation-id'] as string | undefined;

    let tokenId = '';
    if (dto.refreshToken) {
      try {
        const payload = this.jwtService.verify<RefreshPayload>(dto.refreshToken);
        tokenId = payload.tokenId;
      } catch {
        // Si el refresh token es inválido solo blacklisteamos el access token
      }
    }

    await this.commandBus.execute(
      new LogoutCommand(userId, jti, tokenId, correlationId),
    );
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    const correlationId = req.headers['x-correlation-id'] as string | undefined;
    return this.commandBus.execute(
      new RefreshTokenCommand(dto.refreshToken, correlationId),
    );
  }

  @Get('validate')
  @HttpCode(HttpStatus.OK)
  async validate(@Req() req: Request) {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.replace('Bearer ', '') ?? '';
    return this.queryBus.execute(new ValidateTokenQuery(token));
  }
}

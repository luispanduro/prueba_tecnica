import { UnauthorizedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { TokenRedisRepository } from '../../infrastructure/persistence/redis/token.redis-repository';
import { RefreshTokenCommand } from '../commands/refresh-token.command';

interface RefreshTokenPayload {
  sub: string;
  tokenId: string;
}

interface RefreshResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@CommandHandler(RefreshTokenCommand)
export class RefreshTokenHandler
  implements ICommandHandler<RefreshTokenCommand>
{
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly tokenRepo: TokenRedisRepository,
  ) {}

  async execute(command: RefreshTokenCommand): Promise<RefreshResult> {
    let payload: RefreshTokenPayload;
    try {
      payload = this.jwtService.verify<RefreshTokenPayload>(
        command.refreshToken,
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const { sub: userId, tokenId } = payload;

    const isValid = await this.tokenRepo.validateRefreshToken(userId, tokenId);
    if (!isValid) {
      throw new UnauthorizedException('Refresh token expired or revoked');
    }

    await this.tokenRepo.deleteRefreshToken(userId, tokenId);

    const expiresIn = parseInt(this.config.get('JWT_EXPIRES_IN') ?? '900', 10);
    const refreshTtl = parseInt(this.config.get('REFRESH_TOKEN_TTL') ?? '604800', 10);
    const jti = uuidv4();

    const accessToken = this.jwtService.sign(
      { sub: userId, roles: [] as string[], permissions: [] as string[], jti },
      { expiresIn },
    );

    const newTokenId = uuidv4();
    await this.tokenRepo.saveRefreshToken(userId, newTokenId, refreshTtl);

    const refreshToken = this.jwtService.sign(
      { sub: userId, tokenId: newTokenId },
      { expiresIn: refreshTtl },
    );

    return { accessToken, refreshToken, expiresIn };
  }
}

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { TokenRedisRepository } from '../../persistence/redis/token.redis-repository';

interface AccessTokenPayload {
  sub: string;
  email: string;
  roles: string[];
  permissions: string[];
  jti: string;
  iat: number;
  exp: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly tokenRepo: TokenRedisRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? '',
    });
  }

  async validate(payload: AccessTokenPayload) {
    const blacklisted = await this.tokenRepo.isTokenBlacklisted(payload.jti);
    if (blacklisted) {
      throw new UnauthorizedException('Token has been revoked');
    }
    return {
      userId: payload.sub,
      email: payload.email,
      roles: payload.roles,
      permissions: payload.permissions,
      jti: payload.jti,
    };
  }
}

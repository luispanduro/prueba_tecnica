import { UnauthorizedException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { TokenRedisRepository } from '../../infrastructure/persistence/redis/token.redis-repository';
import { ValidateTokenQuery } from '../queries/validate-token.query';

interface AccessTokenPayload {
  sub: string;
  email: string;
  roles: string[];
  permissions: string[];
  jti: string;
  iat: number;
  exp: number;
}

@QueryHandler(ValidateTokenQuery)
export class ValidateTokenHandler
  implements IQueryHandler<ValidateTokenQuery>
{
  constructor(
    private readonly jwtService: JwtService,
    private readonly tokenRepo: TokenRedisRepository,
  ) {}

  async execute(query: ValidateTokenQuery): Promise<AccessTokenPayload> {
    let payload: AccessTokenPayload;
    try {
      payload = this.jwtService.verify<AccessTokenPayload>(query.token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const blacklisted = await this.tokenRepo.isTokenBlacklisted(payload.jti);
    if (blacklisted) {
      throw new UnauthorizedException('Token has been revoked');
    }

    return payload;
  }
}

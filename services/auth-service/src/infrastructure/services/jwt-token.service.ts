import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

export interface TokenPayload {
  sub: string;
  username: string;
  roles: string[];
}

export interface TokenResult {
  access_token: string;
  token_type: string;
  expires_in: number;
}

@Injectable()
export class JwtTokenService {
  private readonly secret: string;
  private readonly expiresIn: number;

  constructor(private readonly config: ConfigService) {
    this.secret = this.config.get<string>('JWT_SECRET', 'local-development-secret');
    this.expiresIn = this.config.get<number>('JWT_EXPIRATION', 3600);
  }

  generate(payload: TokenPayload): TokenResult {
    const token = jwt.sign(
      {
        sub: payload.sub,
        username: payload.username,
        roles: payload.roles,
      },
      this.secret,
      { expiresIn: this.expiresIn },
    );

    return {
      access_token: token,
      token_type: 'Bearer',
      expires_in: this.expiresIn,
    };
  }
}

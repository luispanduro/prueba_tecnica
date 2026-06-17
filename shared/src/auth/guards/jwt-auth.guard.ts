import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { JwtPayload, AuthenticatedUser } from '../interfaces/jwt-payload.interface';

/**
 * Guard that validates JWT tokens using a shared secret.
 * Extracts user_id, username, and roles from the token payload.
 * Returns 401 if token is missing, malformed, expired, or has invalid signature.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Authentication token is required');
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new UnauthorizedException('Authentication configuration error');
    }

    try {
      const payload = jwt.verify(token, secret) as JwtPayload;

      const user: AuthenticatedUser = {
        user_id: payload.sub,
        username: payload.username,
        roles: payload.roles || [],
      };

      // Attach authenticated user to request
      (request as unknown as { user: AuthenticatedUser }).user = user;

      return true;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException('Token has expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedException('Invalid token');
      }
      throw new UnauthorizedException('Authentication failed');
    }
  }

  private extractTokenFromHeader(request: Request): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }
}

import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import * as jwt from 'jsonwebtoken';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  const SECRET = 'test-secret';

  beforeAll(() => {
    process.env.JWT_SECRET = SECRET;
  });

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  const createMockContext = (authHeader?: string): ExecutionContext => {
    const request = { headers: { authorization: authHeader }, user: undefined };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
  };

  it('should allow access with valid token', () => {
    const token = jwt.sign({ sub: 'user-1', username: 'admin', roles: ['admin'] }, SECRET);
    const ctx = createMockContext(`Bearer ${token}`);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should attach user to request', () => {
    const token = jwt.sign({ sub: 'user-1', username: 'admin', roles: ['admin'] }, SECRET);
    const request = { headers: { authorization: `Bearer ${token}` }, user: undefined as unknown };
    const ctx = { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;
    guard.canActivate(ctx);
    expect((request.user as { user_id: string }).user_id).toBe('user-1');
  });

  it('should throw 401 when no token', () => {
    const ctx = createMockContext(undefined);
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('should throw 401 when token is malformed', () => {
    const ctx = createMockContext('Bearer invalid-token');
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('should throw 401 when token is expired', () => {
    const token = jwt.sign({ sub: 'u1', username: 'x', roles: [] }, SECRET, { expiresIn: -1 });
    const ctx = createMockContext(`Bearer ${token}`);
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('should throw 401 when wrong secret', () => {
    const token = jwt.sign({ sub: 'u1', username: 'x', roles: [] }, 'wrong-secret');
    const ctx = createMockContext(`Bearer ${token}`);
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('should throw 401 when not Bearer format', () => {
    const token = jwt.sign({ sub: 'u1', username: 'x', roles: [] }, SECRET);
    const ctx = createMockContext(`Basic ${token}`);
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });
});

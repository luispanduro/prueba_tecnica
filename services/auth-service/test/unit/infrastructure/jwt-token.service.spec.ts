import { JwtTokenService } from '../../../src/infrastructure/services/jwt-token.service';
import * as jwt from 'jsonwebtoken';

describe('JwtTokenService', () => {
  let service: JwtTokenService;
  const SECRET = 'test-jwt-secret';

  beforeEach(() => {
    const mockConfig = { get: (key: string, def: unknown) => {
      if (key === 'JWT_SECRET') return SECRET;
      if (key === 'JWT_EXPIRATION') return 3600;
      return def;
    }} as any;
    service = new JwtTokenService(mockConfig);
  });

  it('should generate a valid JWT', () => {
    const result = service.generate({ sub: 'user-1', username: 'admin', roles: ['admin'] });
    expect(result.access_token).toBeDefined();
    expect(result.token_type).toBe('Bearer');
    expect(result.expires_in).toBe(3600);
  });

  it('should produce decodable token with correct payload', () => {
    const result = service.generate({ sub: 'user-1', username: 'admin', roles: ['admin'] });
    const decoded = jwt.verify(result.access_token, SECRET) as any;
    expect(decoded.sub).toBe('user-1');
    expect(decoded.username).toBe('admin');
    expect(decoded.roles).toEqual(['admin']);
  });

  it('should include roles as array in token', () => {
    const result = service.generate({ sub: 'u1', username: 'x', roles: ['a', 'b'] });
    const decoded = jwt.verify(result.access_token, SECRET) as any;
    expect(decoded.roles).toEqual(['a', 'b']);
  });
});

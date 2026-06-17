import { PasswordService } from '../../../src/infrastructure/services/password.service';

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(() => {
    service = new PasswordService();
  });

  it('should hash a password', async () => {
    const hash = await service.hash('test123');
    expect(hash).toBeDefined();
    expect(hash).not.toBe('test123');
    expect(hash.startsWith('$2b$')).toBe(true);
  });

  it('should verify correct password', async () => {
    const hash = await service.hash('mypassword');
    const result = await service.verify('mypassword', hash);
    expect(result).toBe(true);
  });

  it('should reject wrong password', async () => {
    const hash = await service.hash('mypassword');
    const result = await service.verify('wrongpassword', hash);
    expect(result).toBe(false);
  });

  it('should produce unique hashes for same password', async () => {
    const hash1 = await service.hash('test');
    const hash2 = await service.hash('test');
    expect(hash1).not.toBe(hash2);
  });
});

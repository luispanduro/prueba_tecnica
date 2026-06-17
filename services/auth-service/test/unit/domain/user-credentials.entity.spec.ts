import { UserCredentials } from '../../../src/domain/entities/user-credentials.entity';

describe('UserCredentials Entity', () => {
  const validProps = {
    id: 'uuid-1',
    username: 'admin',
    email: 'admin@example.com',
    passwordHash: '$2b$12$hash',
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('should create valid entity', () => {
    const entity = new UserCredentials(validProps);
    expect(entity.id).toBe('uuid-1');
    expect(entity.username).toBe('admin');
    expect(entity.email).toBe('admin@example.com');
  });

  it('should throw if username empty', () => {
    expect(() => new UserCredentials({ ...validProps, username: '' })).toThrow('Username is required');
  });

  it('should throw if email invalid', () => {
    expect(() => new UserCredentials({ ...validProps, email: 'not-email' })).toThrow('A valid email is required');
  });

  it('should throw if password hash empty', () => {
    expect(() => new UserCredentials({ ...validProps, passwordHash: '' })).toThrow('Password hash is required');
  });
});

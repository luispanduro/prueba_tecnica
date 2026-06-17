import { User } from '../../../src/domain/entities/user.entity';

describe('User Entity', () => {
  const validProps = {
    id: 'uuid-1', username: 'john', email: 'john@test.com',
    firstName: 'John', lastName: 'Doe', isActive: true,
    createdAt: new Date(), updatedAt: new Date(),
  };

  it('should create valid user', () => {
    const user = new User(validProps);
    expect(user.username.value).toBe('john');
    expect(user.email.value).toBe('john@test.com');
  });

  it('should throw if username too short', () => {
    expect(() => new User({ ...validProps, username: 'ab' })).toThrow();
  });

  it('should throw if email invalid', () => {
    expect(() => new User({ ...validProps, email: 'bad' })).toThrow();
  });

  it('should throw if firstName empty', () => {
    expect(() => new User({ ...validProps, firstName: '' })).toThrow('First name is required');
  });

  it('should throw if lastName empty', () => {
    expect(() => new User({ ...validProps, lastName: '  ' })).toThrow('Last name is required');
  });
});

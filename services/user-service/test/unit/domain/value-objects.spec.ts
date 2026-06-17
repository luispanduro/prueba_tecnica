import { Email } from '../../../src/domain/value-objects/email.vo';
import { Username } from '../../../src/domain/value-objects/username.vo';

describe('Email Value Object', () => {
  it('should create valid email', () => {
    const email = new Email('test@example.com');
    expect(email.value).toBe('test@example.com');
  });

  it('should lowercase email', () => {
    const email = new Email('TEST@EXAMPLE.COM');
    expect(email.value).toBe('test@example.com');
  });

  it('should throw for empty email', () => {
    expect(() => new Email('')).toThrow();
  });

  it('should throw for invalid email', () => {
    expect(() => new Email('not-email')).toThrow();
  });

  it('should validate static isValid', () => {
    expect(Email.isValid('good@test.com')).toBe(true);
    expect(Email.isValid('bad')).toBe(false);
  });

  it('should compare emails', () => {
    const a = new Email('a@test.com');
    const b = new Email('a@test.com');
    const c = new Email('b@test.com');
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });
});

describe('Username Value Object', () => {
  it('should create valid username', () => {
    const username = new Username('john');
    expect(username.value).toBe('john');
  });

  it('should trim whitespace', () => {
    const username = new Username('  john  ');
    expect(username.value).toBe('john');
  });

  it('should throw for empty username', () => {
    expect(() => new Username('')).toThrow('Username is required');
  });

  it('should throw for whitespace only', () => {
    expect(() => new Username('   ')).toThrow('Username is required');
  });

  it('should throw for too short', () => {
    expect(() => new Username('ab')).toThrow('at least 3');
  });

  it('should throw for too long', () => {
    expect(() => new Username('a'.repeat(101))).toThrow('at most 100');
  });

  it('should compare usernames', () => {
    const a = new Username('john');
    const b = new Username('john');
    const c = new Username('jane');
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });
});

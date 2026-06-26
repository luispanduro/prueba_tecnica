import { FullName } from './full-name.vo';
import { Email } from './email.vo';
import { InvalidFullNameException } from '../exceptions/invalid-full-name.exception';
import { InvalidEmailException } from '../exceptions/invalid-email.exception';

describe('FullName', () => {
  it('creates valid full name', () => {
    const name = FullName.create('John', 'Doe');
    expect(name.getFirstName()).toBe('John');
    expect(name.getLastName()).toBe('Doe');
    expect(name.getFullName()).toBe('John Doe');
  });

  it('throws on empty first name', () => {
    expect(() => FullName.create('', 'Doe')).toThrow(InvalidFullNameException);
  });

  it('throws on empty last name', () => {
    expect(() => FullName.create('John', '')).toThrow(InvalidFullNameException);
  });

  it('throws when combined name exceeds 100 chars', () => {
    const long = 'A'.repeat(51);
    expect(() => FullName.create(long, long)).toThrow(InvalidFullNameException);
  });

  it('equals returns true for same name', () => {
    expect(FullName.create('John', 'Doe').equals(FullName.create('John', 'Doe'))).toBe(true);
  });

  it('equals returns false for different name', () => {
    expect(FullName.create('John', 'Doe').equals(FullName.create('Jane', 'Doe'))).toBe(false);
  });
});

describe('Email', () => {
  it('normalizes to lowercase', () => {
    expect(Email.create('JOHN@EXAMPLE.COM').getValue()).toBe('john@example.com');
  });

  it('throws on invalid email', () => {
    expect(() => Email.create('not-an-email')).toThrow(InvalidEmailException);
  });

  it('throws on empty string', () => {
    expect(() => Email.create('')).toThrow(InvalidEmailException);
  });

  it('equals returns true for same email', () => {
    expect(Email.create('a@b.com').equals(Email.create('A@B.COM'))).toBe(true);
  });
});

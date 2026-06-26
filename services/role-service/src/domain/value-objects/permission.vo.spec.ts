import { Permission } from './permission.vo';
import { InvalidPermissionException } from '../exceptions/invalid-permission.exception';

describe('Permission', () => {
  it('accepts valid permission format', () => {
    const perm = Permission.create('users:read');
    expect(perm.getValue()).toBe('users:read');
  });

  it('accepts wildcard action', () => {
    expect(Permission.create('users:*').getValue()).toBe('users:*');
  });

  it('throws on missing colon', () => {
    expect(() => Permission.create('invalid')).toThrow(InvalidPermissionException);
  });

  it('throws on empty string', () => {
    expect(() => Permission.create('')).toThrow(InvalidPermissionException);
  });

  it('throws on uppercase letters', () => {
    expect(() => Permission.create('Users:Read')).toThrow(InvalidPermissionException);
  });

  it('equals returns true for same value', () => {
    const a = Permission.create('roles:write');
    const b = Permission.create('roles:write');
    expect(a.equals(b)).toBe(true);
  });

  it('equals returns false for different values', () => {
    const a = Permission.create('roles:write');
    const b = Permission.create('roles:read');
    expect(a.equals(b)).toBe(false);
  });
});

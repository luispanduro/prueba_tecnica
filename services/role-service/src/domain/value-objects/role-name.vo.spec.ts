import { RoleName } from './role-name.vo';
import { InvalidRoleNameException } from '../exceptions/invalid-role-name.exception';

describe('RoleName', () => {
  it('accepts valid name and uppercases it', () => {
    const name = RoleName.create('admin');
    expect(name.getValue()).toBe('ADMIN');
  });

  it('accepts already-uppercase names', () => {
    expect(RoleName.create('SUPER_ADMIN').getValue()).toBe('SUPER_ADMIN');
  });

  it('throws on empty string', () => {
    expect(() => RoleName.create('')).toThrow(InvalidRoleNameException);
  });

  it('throws on name with spaces', () => {
    expect(() => RoleName.create('admin role')).toThrow(InvalidRoleNameException);
  });

  it('throws on name exceeding 50 chars', () => {
    expect(() => RoleName.create('A'.repeat(51))).toThrow(InvalidRoleNameException);
  });

  it('equals returns true for same value', () => {
    const a = RoleName.create('ADMIN');
    const b = RoleName.create('admin');
    expect(a.equals(b)).toBe(true);
  });
});

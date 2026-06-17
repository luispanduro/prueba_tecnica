import { describe, it, expect } from 'vitest';
import { loginSchema } from '../schemas/auth.schema';
import { createUserSchema } from '../schemas/user.schema';
import { createRoleSchema, assignRoleSchema } from '../schemas/role.schema';
import { querySchema } from '../schemas/ai.schema';

describe('Login Schema', () => {
  it('accepts valid login data', () => {
    const result = loginSchema.safeParse({ usernameOrEmail: 'admin', password: 'pass123' });
    expect(result.success).toBe(true);
  });
  it('rejects empty usernameOrEmail', () => {
    const result = loginSchema.safeParse({ usernameOrEmail: '', password: 'pass' });
    expect(result.success).toBe(false);
  });
  it('rejects empty password', () => {
    const result = loginSchema.safeParse({ usernameOrEmail: 'admin', password: '' });
    expect(result.success).toBe(false);
  });
});

describe('Create User Schema', () => {
  it('accepts valid data', () => {
    const result = createUserSchema.safeParse({ username: 'john', email: 'j@t.com', firstName: 'J', lastName: 'D', password: 'pass123' });
    expect(result.success).toBe(true);
  });
  it('rejects short username', () => {
    const result = createUserSchema.safeParse({ username: 'ab', email: 'j@t.com', firstName: 'J', lastName: 'D', password: 'pass123' });
    expect(result.success).toBe(false);
  });
  it('rejects invalid email', () => {
    const result = createUserSchema.safeParse({ username: 'john', email: 'bad', firstName: 'J', lastName: 'D', password: 'pass123' });
    expect(result.success).toBe(false);
  });
  it('rejects short password', () => {
    const result = createUserSchema.safeParse({ username: 'john', email: 'j@t.com', firstName: 'J', lastName: 'D', password: '12345' });
    expect(result.success).toBe(false);
  });
});

describe('Create Role Schema', () => {
  it('accepts valid role', () => {
    const result = createRoleSchema.safeParse({ name: 'admin' });
    expect(result.success).toBe(true);
  });
  it('rejects empty name', () => {
    const result = createRoleSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });
  it('rejects name over 50 chars', () => {
    const result = createRoleSchema.safeParse({ name: 'a'.repeat(51) });
    expect(result.success).toBe(false);
  });
});

describe('Assign Role Schema', () => {
  it('accepts valid UUIDs', () => {
    const result = assignRoleSchema.safeParse({ userId: 'a0000000-0000-4000-8000-000000000001', roleId: 'b0000000-0000-4000-9000-000000000001' });
    expect(result.success).toBe(true);
  });
  it('rejects invalid UUID', () => {
    const result = assignRoleSchema.safeParse({ userId: 'not-uuid', roleId: 'b0000000-0000-4000-9000-000000000001' });
    expect(result.success).toBe(false);
  });
});

describe('AI Query Schema', () => {
  it('accepts valid query', () => {
    const result = querySchema.safeParse({ query: 'Who is admin?' });
    expect(result.success).toBe(true);
  });
  it('rejects empty query', () => {
    const result = querySchema.safeParse({ query: '' });
    expect(result.success).toBe(false);
  });
});

import { Role } from '../../../src/domain/entities/role.entity';
import { UserRole } from '../../../src/domain/entities/user-role.entity';

describe('Role Entity', () => {
  it('should create valid role', () => {
    const role = new Role({ id: 'r1', name: 'admin', description: 'Admin', createdAt: new Date(), updatedAt: new Date() });
    expect(role.name.value).toBe('admin');
  });

  it('should throw if name empty', () => {
    expect(() => new Role({ id: 'r1', name: '', description: '', createdAt: new Date(), updatedAt: new Date() })).toThrow();
  });

  it('should normalize name to lowercase', () => {
    const role = new Role({ id: 'r1', name: 'Admin', description: '', createdAt: new Date(), updatedAt: new Date() });
    expect(role.name.value).toBe('admin');
  });
});

describe('UserRole Entity', () => {
  it('should create valid user role', () => {
    const ur = new UserRole({ id: 'ur1', userId: 'u1', roleId: 'r1', assignedAt: new Date(), assignedBy: 'admin' });
    expect(ur.userId).toBe('u1');
  });

  it('should throw if userId empty', () => {
    expect(() => new UserRole({ id: 'ur1', userId: '', roleId: 'r1', assignedAt: new Date(), assignedBy: 'a' })).toThrow();
  });

  it('should throw if roleId empty', () => {
    expect(() => new UserRole({ id: 'ur1', userId: 'u1', roleId: '', assignedAt: new Date(), assignedBy: 'a' })).toThrow();
  });
});

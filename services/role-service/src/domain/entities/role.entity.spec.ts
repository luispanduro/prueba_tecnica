import { NotFoundException } from '@nestjs/common';
import { Role } from './role.entity';
import { RoleName } from '../value-objects/role-name.vo';
import { Permission } from '../value-objects/permission.vo';
import { SystemRoleModificationException } from '../exceptions/system-role-modification.exception';

describe('Role entity', () => {
  function makeRole(isSystem = false): Role {
    return Role.create(
      'test-id',
      RoleName.create('TEST_ROLE'),
      'Test description',
      isSystem,
    );
  }

  describe('create', () => {
    it('creates a role with empty permissions', () => {
      const role = makeRole();
      expect(role.id).toBe('test-id');
      expect(role.name.getValue()).toBe('TEST_ROLE');
      expect(role.description).toBe('Test description');
      expect(role.permissions).toHaveLength(0);
      expect(role.isSystem).toBe(false);
    });
  });

  describe('addPermission', () => {
    it('adds a permission', () => {
      const role = makeRole();
      role.addPermission(Permission.create('users:read'));
      expect(role.permissions).toHaveLength(1);
    });

    it('does not duplicate the same permission', () => {
      const role = makeRole();
      role.addPermission(Permission.create('users:read'));
      role.addPermission(Permission.create('users:read'));
      expect(role.permissions).toHaveLength(1);
    });
  });

  describe('removePermission', () => {
    it('removes an existing permission', () => {
      const role = makeRole();
      role.addPermission(Permission.create('users:read'));
      role.removePermission(Permission.create('users:read'));
      expect(role.permissions).toHaveLength(0);
    });

    it('throws NotFoundException for missing permission', () => {
      const role = makeRole();
      expect(() =>
        role.removePermission(Permission.create('users:read')),
      ).toThrow(NotFoundException);
    });
  });

  describe('rename', () => {
    it('renames a non-system role', () => {
      const role = makeRole(false);
      role.rename(RoleName.create('NEW_NAME'));
      expect(role.name.getValue()).toBe('NEW_NAME');
    });

    it('throws SystemRoleModificationException for system roles', () => {
      const role = makeRole(true);
      expect(() => role.rename(RoleName.create('NEW_NAME'))).toThrow(
        SystemRoleModificationException,
      );
    });
  });

  describe('reconstitute', () => {
    it('reconstructs a role from persistence data', () => {
      const now = new Date();
      const perms = [Permission.create('roles:read')];
      const role = Role.reconstitute(
        'id-1',
        RoleName.create('ADMIN'),
        'Admin',
        perms,
        true,
        now,
        now,
      );
      expect(role.id).toBe('id-1');
      expect(role.isSystem).toBe(true);
      expect(role.permissions).toHaveLength(1);
    });
  });
});

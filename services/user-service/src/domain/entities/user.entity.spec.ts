import { NotFoundException } from '@nestjs/common';
import { User } from './user.entity';
import { FullName } from '../value-objects/full-name.vo';
import { Email } from '../value-objects/email.vo';
import { UserStatus } from '../value-objects/user-status.vo';

function makeUser(roleIds: string[] = []): User {
  return User.create(
    'user-id',
    FullName.create('John', 'Doe'),
    Email.create('john@example.com'),
    roleIds,
  );
}

describe('User entity', () => {
  describe('create', () => {
    it('creates user with ACTIVE status and empty roles by default', () => {
      const user = makeUser();
      expect(user.status).toBe(UserStatus.ACTIVE);
      expect(user.roleIds).toHaveLength(0);
    });

    it('creates user with initial roleIds', () => {
      const user = makeUser(['role-1']);
      expect(user.roleIds).toEqual(['role-1']);
    });
  });

  describe('assignRole', () => {
    it('adds a role', () => {
      const user = makeUser();
      user.assignRole('role-1');
      expect(user.roleIds).toContain('role-1');
    });

    it('does not duplicate the same role', () => {
      const user = makeUser();
      user.assignRole('role-1');
      user.assignRole('role-1');
      expect(user.roleIds).toHaveLength(1);
    });
  });

  describe('removeRole', () => {
    it('removes an existing role', () => {
      const user = makeUser(['role-1']);
      user.removeRole('role-1');
      expect(user.roleIds).toHaveLength(0);
    });

    it('throws NotFoundException for non-existent role', () => {
      const user = makeUser();
      expect(() => user.removeRole('nonexistent')).toThrow(NotFoundException);
    });
  });

  describe('deactivate / activate', () => {
    it('deactivates an active user', () => {
      const user = makeUser();
      user.deactivate();
      expect(user.status).toBe(UserStatus.INACTIVE);
    });

    it('activates an inactive user', () => {
      const user = makeUser();
      user.deactivate();
      user.activate();
      expect(user.status).toBe(UserStatus.ACTIVE);
    });
  });

  describe('update', () => {
    it('updates name and email', () => {
      const user = makeUser();
      user.update(
        FullName.create('Jane', 'Smith'),
        Email.create('jane@example.com'),
      );
      expect(user.name.getFullName()).toBe('Jane Smith');
      expect(user.email.getValue()).toBe('jane@example.com');
    });
  });

  describe('reconstitute', () => {
    it('rebuilds user from persistence', () => {
      const now = new Date();
      const user = User.reconstitute(
        'id',
        FullName.create('Alice', 'Wonder'),
        Email.create('alice@example.com'),
        UserStatus.INACTIVE,
        ['role-a'],
        now,
        now,
      );
      expect(user.status).toBe(UserStatus.INACTIVE);
      expect(user.roleIds).toEqual(['role-a']);
    });
  });
});

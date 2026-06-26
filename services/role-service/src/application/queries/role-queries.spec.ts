import { NotFoundException } from '@nestjs/common';
import { Role } from '../../domain/entities/role.entity';
import { RoleName } from '../../domain/value-objects/role-name.vo';
import { Permission } from '../../domain/value-objects/permission.vo';
import { IRoleRepository } from '../../domain/repositories/role.repository.interface';
import { GetRoleQuery, GetRoleHandler } from './get-role.query';
import { GetRolesQuery, GetRolesHandler } from './get-roles.query';
import {
  GetRolePermissionsQuery,
  GetRolePermissionsHandler,
} from './get-role-permissions.query';

function makeRole(): Role {
  const role = Role.create(
    'role-id',
    RoleName.create('ADMIN'),
    'Admin role',
    true,
  );
  role.addPermission(Permission.create('users:read'));
  return role;
}

function makeRepo(role: Role | null): jest.Mocked<IRoleRepository> {
  return {
    findById: jest.fn().mockResolvedValue(role),
    findByName: jest.fn().mockResolvedValue(null),
    findAll: jest.fn().mockResolvedValue(role ? [role] : []),
    save: jest.fn(),
    delete: jest.fn(),
  } as unknown as jest.Mocked<IRoleRepository>;
}

describe('GetRoleHandler', () => {
  it('returns role DTO when found', async () => {
    const role = makeRole();
    const repo = makeRepo(role);
    const handler = new GetRoleHandler(repo);

    const dto = await handler.execute(new GetRoleQuery('role-id'));

    expect(dto.id).toBe('role-id');
    expect(dto.name).toBe('ADMIN');
    expect(dto.permissions).toEqual(['users:read']);
    expect(dto.isSystem).toBe(true);
  });

  it('throws NotFoundException when role missing', async () => {
    const handler = new GetRoleHandler(makeRepo(null));

    await expect(
      handler.execute(new GetRoleQuery('missing')),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('GetRolesHandler', () => {
  it('returns all roles as DTOs', async () => {
    const role = makeRole();
    const repo = makeRepo(role);
    const handler = new GetRolesHandler(repo);

    const dtos = await handler.execute(new GetRolesQuery());

    expect(dtos).toHaveLength(1);
    expect(dtos[0].name).toBe('ADMIN');
  });

  it('returns empty array when no roles', async () => {
    const repo = makeRepo(null);
    const handler = new GetRolesHandler(repo);

    const dtos = await handler.execute(new GetRolesQuery());

    expect(dtos).toHaveLength(0);
  });
});

describe('GetRolePermissionsHandler', () => {
  it('returns permissions array', async () => {
    const role = makeRole();
    const repo = makeRepo(role);
    const handler = new GetRolePermissionsHandler(repo);

    const perms = await handler.execute(new GetRolePermissionsQuery('role-id'));

    expect(perms).toEqual(['users:read']);
  });

  it('throws NotFoundException when role missing', async () => {
    const handler = new GetRolePermissionsHandler(makeRepo(null));

    await expect(
      handler.execute(new GetRolePermissionsQuery('missing')),
    ).rejects.toThrow(NotFoundException);
  });
});

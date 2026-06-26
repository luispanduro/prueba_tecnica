import { ConflictException, NotFoundException } from '@nestjs/common';
import { Role } from '../../domain/entities/role.entity';
import { RoleName } from '../../domain/value-objects/role-name.vo';
import { Permission } from '../../domain/value-objects/permission.vo';
import { IRoleRepository } from '../../domain/repositories/role.repository.interface';
import { RabbitmqEventPublisher } from '../../infrastructure/messaging/rabbitmq/event-publisher';
import { CreateRoleCommand, CreateRoleHandler } from './create-role.command';
import { UpdateRoleCommand, UpdateRoleHandler } from './update-role.command';
import { DeleteRoleCommand, DeleteRoleHandler } from './delete-role.command';
import {
  AddPermissionCommand,
  AddPermissionHandler,
} from './add-permission.command';
import {
  RemovePermissionCommand,
  RemovePermissionHandler,
} from './remove-permission.command';

jest.mock('uuid', () => ({ v4: jest.fn(() => 'mock-uuid') }));

function makeRole(overrides: Partial<{ isSystem: boolean }> = {}): Role {
  return Role.create(
    'role-id',
    RoleName.create('TEST'),
    'desc',
    overrides.isSystem ?? false,
  );
}

function makePublisher(): jest.Mocked<RabbitmqEventPublisher> {
  return { publish: jest.fn().mockResolvedValue(undefined) } as unknown as jest.Mocked<RabbitmqEventPublisher>;
}

function makeRepo(role: Role | null = null): jest.Mocked<IRoleRepository> {
  return {
    findById: jest.fn().mockResolvedValue(role),
    findByName: jest.fn().mockResolvedValue(null),
    findAll: jest.fn().mockResolvedValue([]),
    save: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<IRoleRepository>;
}

describe('CreateRoleHandler', () => {
  it('creates role and publishes event', async () => {
    const repo = makeRepo();
    const publisher = makePublisher();
    const handler = new CreateRoleHandler(repo, publisher);

    const id = await handler.execute(
      new CreateRoleCommand('MANAGER', 'Manager role', false, 'corr-1'),
    );

    expect(id).toBe('mock-uuid');
    expect(repo.save).toHaveBeenCalled();
    expect(publisher.publish).toHaveBeenCalledWith(
      'roles.role.created',
      expect.objectContaining({ eventType: 'roles.role.created' }),
    );
  });

  it('throws ConflictException if role name already exists', async () => {
    const existing = makeRole();
    const repo = makeRepo();
    repo.findByName.mockResolvedValue(existing);
    const handler = new CreateRoleHandler(repo, makePublisher());

    await expect(
      handler.execute(new CreateRoleCommand('TEST', 'desc', false, 'corr')),
    ).rejects.toThrow(ConflictException);
  });
});

describe('UpdateRoleHandler', () => {
  it('updates description and publishes event', async () => {
    const role = makeRole();
    const repo = makeRepo(role);
    const publisher = makePublisher();
    const handler = new UpdateRoleHandler(repo, publisher);

    await handler.execute(
      new UpdateRoleCommand('role-id', 'New description', 'corr'),
    );

    expect(repo.save).toHaveBeenCalled();
    expect(publisher.publish).toHaveBeenCalledWith(
      'roles.role.updated',
      expect.objectContaining({ eventType: 'roles.role.updated' }),
    );
  });

  it('throws NotFoundException if role not found', async () => {
    const repo = makeRepo(null);
    const handler = new UpdateRoleHandler(repo, makePublisher());

    await expect(
      handler.execute(new UpdateRoleCommand('bad-id', 'desc', 'corr')),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('DeleteRoleHandler', () => {
  it('deletes non-system role and publishes event', async () => {
    const role = makeRole({ isSystem: false });
    const repo = makeRepo(role);
    const publisher = makePublisher();
    const handler = new DeleteRoleHandler(repo, publisher);

    await handler.execute(new DeleteRoleCommand('role-id', 'corr'));

    expect(repo.delete).toHaveBeenCalledWith('role-id');
    expect(publisher.publish).toHaveBeenCalledWith(
      'roles.role.deleted',
      expect.objectContaining({ eventType: 'roles.role.deleted' }),
    );
  });

  it('throws ConflictException for system roles', async () => {
    const role = makeRole({ isSystem: true });
    const repo = makeRepo(role);
    const handler = new DeleteRoleHandler(repo, makePublisher());

    await expect(
      handler.execute(new DeleteRoleCommand('role-id', 'corr')),
    ).rejects.toThrow(ConflictException);
  });

  it('throws NotFoundException if role not found', async () => {
    const repo = makeRepo(null);
    const handler = new DeleteRoleHandler(repo, makePublisher());

    await expect(
      handler.execute(new DeleteRoleCommand('bad-id', 'corr')),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('AddPermissionHandler', () => {
  it('adds permission and publishes event', async () => {
    const role = makeRole();
    const repo = makeRepo(role);
    const publisher = makePublisher();
    const handler = new AddPermissionHandler(repo, publisher);

    await handler.execute(
      new AddPermissionCommand('role-id', 'users:read', 'corr'),
    );

    expect(repo.save).toHaveBeenCalled();
    expect(role.permissions).toHaveLength(1);
    expect(publisher.publish).toHaveBeenCalled();
  });

  it('throws NotFoundException if role not found', async () => {
    const repo = makeRepo(null);
    const handler = new AddPermissionHandler(repo, makePublisher());

    await expect(
      handler.execute(new AddPermissionCommand('bad', 'users:read', 'corr')),
    ).rejects.toThrow(NotFoundException);
  });

  it('does not duplicate permission', async () => {
    const role = makeRole();
    role.addPermission(Permission.create('users:read'));
    const repo = makeRepo(role);
    const handler = new AddPermissionHandler(repo, makePublisher());

    await handler.execute(
      new AddPermissionCommand('role-id', 'users:read', 'corr'),
    );

    expect(role.permissions).toHaveLength(1);
  });
});

describe('RemovePermissionHandler', () => {
  it('removes an existing permission and publishes event', async () => {
    const role = makeRole();
    role.addPermission(Permission.create('users:read'));
    const repo = makeRepo(role);
    const publisher = makePublisher();
    const handler = new RemovePermissionHandler(repo, publisher);

    await handler.execute(
      new RemovePermissionCommand('role-id', 'users:read', 'corr'),
    );

    expect(repo.save).toHaveBeenCalled();
    expect(role.permissions).toHaveLength(0);
    expect(publisher.publish).toHaveBeenCalled();
  });

  it('throws NotFoundException if role not found', async () => {
    const repo = makeRepo(null);
    const handler = new RemovePermissionHandler(repo, makePublisher());

    await expect(
      handler.execute(
        new RemovePermissionCommand('bad', 'users:read', 'corr'),
      ),
    ).rejects.toThrow(NotFoundException);
  });
});

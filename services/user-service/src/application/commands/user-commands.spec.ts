import { ConflictException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { RabbitmqEventPublisher } from '../../infrastructure/messaging/rabbitmq/event-publisher';
import { RoleServiceClient } from '../../infrastructure/http-clients/role-service.client';
import { User } from '../../domain/entities/user.entity';
import { FullName } from '../../domain/value-objects/full-name.vo';
import { Email } from '../../domain/value-objects/email.vo';
import { CreateUserCommand, CreateUserHandler } from './create-user.command';
import { UpdateUserCommand, UpdateUserHandler } from './update-user.command';
import { DeleteUserCommand, DeleteUserHandler } from './delete-user.command';
import { AssignRoleCommand, AssignRoleHandler } from './assign-role.command';
import { RemoveRoleCommand, RemoveRoleHandler } from './remove-role.command';

jest.mock('uuid', () => ({ v4: jest.fn(() => 'mock-uuid') }));

function makeUser(roleIds: string[] = []): User {
  return User.create(
    'user-id',
    FullName.create('John', 'Doe'),
    Email.create('john@example.com'),
    roleIds,
  );
}

function makeRepo(user: User | null = null): jest.Mocked<IUserRepository> {
  return {
    findById: jest.fn().mockResolvedValue(user),
    findAll: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 10 }),
    findByEmail: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<IUserRepository>;
}

function makePublisher(): jest.Mocked<RabbitmqEventPublisher> {
  return { publish: jest.fn().mockResolvedValue(undefined) } as unknown as jest.Mocked<RabbitmqEventPublisher>;
}

function makeRoleClient(exists = true): jest.Mocked<RoleServiceClient> {
  return { roleExists: jest.fn().mockResolvedValue(exists) } as unknown as jest.Mocked<RoleServiceClient>;
}

describe('CreateUserHandler', () => {
  it('creates user and publishes event', async () => {
    const repo = makeRepo();
    const publisher = makePublisher();
    const roleClient = makeRoleClient(true);
    const handler = new CreateUserHandler(repo, publisher, roleClient);

    const id = await handler.execute(
      new CreateUserCommand('John', 'Doe', 'john@example.com', [], 'corr'),
    );

    expect(id).toBe('mock-uuid');
    expect(repo.save).toHaveBeenCalled();
    expect(publisher.publish).toHaveBeenCalledWith(
      'users.user.created',
      expect.objectContaining({ eventType: 'users.user.created' }),
    );
  });

  it('throws ConflictException for duplicate email', async () => {
    const user = makeUser();
    const repo = makeRepo();
    repo.findByEmail.mockResolvedValue(user);
    const handler = new CreateUserHandler(repo, makePublisher(), makeRoleClient());

    await expect(
      handler.execute(new CreateUserCommand('John', 'Doe', 'john@example.com', [], 'corr')),
    ).rejects.toThrow(ConflictException);
  });

  it('throws NotFoundException when roleId does not exist', async () => {
    const repo = makeRepo();
    const roleClient = makeRoleClient(false);
    const handler = new CreateUserHandler(repo, makePublisher(), roleClient);

    await expect(
      handler.execute(
        new CreateUserCommand('John', 'Doe', 'john@example.com', ['bad-role'], 'corr'),
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('propagates ServiceUnavailableException when Role Service is down', async () => {
    const repo = makeRepo();
    const roleClient = makeRoleClient();
    roleClient.roleExists.mockRejectedValue(
      new ServiceUnavailableException('Role Service unavailable'),
    );
    const handler = new CreateUserHandler(repo, makePublisher(), roleClient);

    await expect(
      handler.execute(
        new CreateUserCommand('John', 'Doe', 'john@example.com', ['some-role'], 'corr'),
      ),
    ).rejects.toThrow(ServiceUnavailableException);
  });
});

describe('UpdateUserHandler', () => {
  it('updates user and publishes event', async () => {
    const user = makeUser();
    const repo = makeRepo(user);
    const publisher = makePublisher();
    const handler = new UpdateUserHandler(repo, publisher);

    await handler.execute(
      new UpdateUserCommand('user-id', 'Jane', 'Smith', 'jane@example.com', 'corr'),
    );

    expect(repo.save).toHaveBeenCalled();
    expect(publisher.publish).toHaveBeenCalledWith(
      'users.user.updated',
      expect.objectContaining({ eventType: 'users.user.updated' }),
    );
  });

  it('throws NotFoundException when user not found', async () => {
    const repo = makeRepo(null);
    const handler = new UpdateUserHandler(repo, makePublisher());

    await expect(
      handler.execute(
        new UpdateUserCommand('bad', 'Jane', 'Smith', 'jane@example.com', 'corr'),
      ),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('DeleteUserHandler', () => {
  it('deletes user and publishes event', async () => {
    const user = makeUser();
    const repo = makeRepo(user);
    const publisher = makePublisher();
    const handler = new DeleteUserHandler(repo, publisher);

    await handler.execute(new DeleteUserCommand('user-id', 'corr'));

    expect(repo.delete).toHaveBeenCalledWith('user-id');
    expect(publisher.publish).toHaveBeenCalledWith(
      'users.user.deleted',
      expect.objectContaining({ eventType: 'users.user.deleted' }),
    );
  });

  it('throws NotFoundException when user not found', async () => {
    const repo = makeRepo(null);
    const handler = new DeleteUserHandler(repo, makePublisher());

    await expect(
      handler.execute(new DeleteUserCommand('bad', 'corr')),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('AssignRoleHandler', () => {
  it('assigns role and publishes event', async () => {
    const user = makeUser();
    const repo = makeRepo(user);
    const publisher = makePublisher();
    const roleClient = makeRoleClient(true);
    const handler = new AssignRoleHandler(repo, publisher, roleClient);

    await handler.execute(new AssignRoleCommand('user-id', 'role-1', 'corr'));

    expect(user.roleIds).toContain('role-1');
    expect(publisher.publish).toHaveBeenCalledWith(
      'users.user.role.assigned',
      expect.objectContaining({ eventType: 'users.user.role.assigned' }),
    );
  });

  it('throws NotFoundException when role does not exist', async () => {
    const user = makeUser();
    const repo = makeRepo(user);
    const roleClient = makeRoleClient(false);
    const handler = new AssignRoleHandler(repo, makePublisher(), roleClient);

    await expect(
      handler.execute(new AssignRoleCommand('user-id', 'bad-role', 'corr')),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when user not found', async () => {
    const repo = makeRepo(null);
    const handler = new AssignRoleHandler(repo, makePublisher(), makeRoleClient());

    await expect(
      handler.execute(new AssignRoleCommand('bad', 'role-1', 'corr')),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('RemoveRoleHandler', () => {
  it('removes role and publishes event', async () => {
    const user = makeUser(['role-1']);
    const repo = makeRepo(user);
    const publisher = makePublisher();
    const handler = new RemoveRoleHandler(repo, publisher);

    await handler.execute(new RemoveRoleCommand('user-id', 'role-1', 'corr'));

    expect(user.roleIds).not.toContain('role-1');
    expect(publisher.publish).toHaveBeenCalledWith(
      'users.user.role.removed',
      expect.objectContaining({ eventType: 'users.user.role.removed' }),
    );
  });

  it('throws NotFoundException when user not found', async () => {
    const repo = makeRepo(null);
    const handler = new RemoveRoleHandler(repo, makePublisher());

    await expect(
      handler.execute(new RemoveRoleCommand('bad', 'role-1', 'corr')),
    ).rejects.toThrow(NotFoundException);
  });
});

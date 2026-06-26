import { NotFoundException } from '@nestjs/common';
import { IUserRepository, PaginatedResult } from '../../domain/repositories/user.repository.interface';
import { User } from '../../domain/entities/user.entity';
import { FullName } from '../../domain/value-objects/full-name.vo';
import { Email } from '../../domain/value-objects/email.vo';
import { UserStatus } from '../../domain/value-objects/user-status.vo';
import { GetUserQuery, GetUserHandler } from './get-user.query';
import { GetUsersQuery, GetUsersHandler } from './get-users.query';
import { GetUserRolesQuery, GetUserRolesHandler } from './get-user-roles.query';

function makeUser(): User {
  return User.create(
    'user-id',
    FullName.create('John', 'Doe'),
    Email.create('john@example.com'),
    ['role-1'],
  );
}

function makeRepo(user: User | null): jest.Mocked<IUserRepository> {
  const paginatedResult: PaginatedResult<User> = user
    ? { items: [user], total: 1, page: 1, limit: 10 }
    : { items: [], total: 0, page: 1, limit: 10 };
  return {
    findById: jest.fn().mockResolvedValue(user),
    findAll: jest.fn().mockResolvedValue(paginatedResult),
    findByEmail: jest.fn().mockResolvedValue(null),
    save: jest.fn(),
    delete: jest.fn(),
  } as unknown as jest.Mocked<IUserRepository>;
}

describe('GetUserHandler', () => {
  it('returns user DTO when found', async () => {
    const user = makeUser();
    const handler = new GetUserHandler(makeRepo(user));

    const dto = await handler.execute(new GetUserQuery('user-id'));

    expect(dto.id).toBe('user-id');
    expect(dto.email).toBe('john@example.com');
    expect(dto.roleIds).toEqual(['role-1']);
  });

  it('throws NotFoundException when user missing', async () => {
    const handler = new GetUserHandler(makeRepo(null));

    await expect(
      handler.execute(new GetUserQuery('missing')),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('GetUsersHandler', () => {
  it('returns paginated user DTOs', async () => {
    const user = makeUser();
    const repo = makeRepo(user);
    const handler = new GetUsersHandler(repo);

    const result = await handler.execute(new GetUsersQuery(1, 10));

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
  });

  it('passes filter to repository', async () => {
    const repo = makeRepo(null);
    const handler = new GetUsersHandler(repo);

    await handler.execute(new GetUsersQuery(2, 5, UserStatus.ACTIVE, 'john'));

    expect(repo.findAll).toHaveBeenCalledWith({
      page: 2,
      limit: 5,
      status: UserStatus.ACTIVE,
      email: 'john',
    });
  });
});

describe('GetUserRolesHandler', () => {
  it('returns role IDs for existing user', async () => {
    const user = makeUser();
    const handler = new GetUserRolesHandler(makeRepo(user));

    const roleIds = await handler.execute(new GetUserRolesQuery('user-id'));

    expect(roleIds).toEqual(['role-1']);
  });

  it('throws NotFoundException when user missing', async () => {
    const handler = new GetUserRolesHandler(makeRepo(null));

    await expect(
      handler.execute(new GetUserRolesQuery('missing')),
    ).rejects.toThrow(NotFoundException);
  });
});

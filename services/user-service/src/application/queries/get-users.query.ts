import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../domain/repositories/user.repository.interface';
import { UserStatus } from '../../domain/value-objects/user-status.vo';
import { UserDto } from './get-user.query';

export interface PaginatedUsersDto {
  items: UserDto[];
  total: number;
  page: number;
  limit: number;
}

export class GetUsersQuery implements IQuery {
  constructor(
    public readonly page: number = 1,
    public readonly limit: number = 10,
    public readonly status?: string,
    public readonly email?: string,
  ) {}
}

@QueryHandler(GetUsersQuery)
export class GetUsersHandler
  implements IQueryHandler<GetUsersQuery, PaginatedUsersDto>
{
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
  ) {}

  async execute(query: GetUsersQuery): Promise<PaginatedUsersDto> {
    const result = await this.userRepo.findAll({
      page: query.page,
      limit: query.limit,
      status: query.status as UserStatus | undefined,
      email: query.email,
    });

    return {
      items: result.items.map((user) => ({
        id: user.id,
        firstName: user.name.getFirstName(),
        lastName: user.name.getLastName(),
        email: user.email.getValue(),
        status: user.status,
        roleIds: user.roleIds,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }
}

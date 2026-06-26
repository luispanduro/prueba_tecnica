import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../domain/repositories/user.repository.interface';

export class GetUserRolesQuery implements IQuery {
  constructor(public readonly userId: string) {}
}

@QueryHandler(GetUserRolesQuery)
export class GetUserRolesHandler
  implements IQueryHandler<GetUserRolesQuery, string[]>
{
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
  ) {}

  async execute(query: GetUserRolesQuery): Promise<string[]> {
    const user = await this.userRepo.findById(query.userId);
    if (!user) {
      throw new NotFoundException(`User ${query.userId} not found`);
    }
    return user.roleIds;
  }
}

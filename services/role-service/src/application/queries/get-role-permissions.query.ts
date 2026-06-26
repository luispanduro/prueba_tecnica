import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import {
  IRoleRepository,
  ROLE_REPOSITORY,
} from '../../domain/repositories/role.repository.interface';

export class GetRolePermissionsQuery implements IQuery {
  constructor(public readonly id: string) {}
}

@QueryHandler(GetRolePermissionsQuery)
export class GetRolePermissionsHandler
  implements IQueryHandler<GetRolePermissionsQuery, string[]>
{
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roleRepo: IRoleRepository,
  ) {}

  async execute(query: GetRolePermissionsQuery): Promise<string[]> {
    const role = await this.roleRepo.findById(query.id);
    if (!role) {
      throw new NotFoundException(`Role ${query.id} not found`);
    }
    return role.permissions.map((p) => p.getValue());
  }
}

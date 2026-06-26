import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import {
  IRoleRepository,
  ROLE_REPOSITORY,
} from '../../domain/repositories/role.repository.interface';
import { RoleDto } from './get-role.query';

export class GetRolesQuery implements IQuery {}

@QueryHandler(GetRolesQuery)
export class GetRolesHandler
  implements IQueryHandler<GetRolesQuery, RoleDto[]>
{
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roleRepo: IRoleRepository,
  ) {}

  async execute(_query: GetRolesQuery): Promise<RoleDto[]> {
    const roles = await this.roleRepo.findAll();
    return roles.map((role) => ({
      id: role.id,
      name: role.name.getValue(),
      description: role.description,
      permissions: role.permissions.map((p) => p.getValue()),
      isSystem: role.isSystem,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    }));
  }
}

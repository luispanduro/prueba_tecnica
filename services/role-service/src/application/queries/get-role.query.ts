import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import {
  IRoleRepository,
  ROLE_REPOSITORY,
} from '../../domain/repositories/role.repository.interface';

export interface RoleDto {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class GetRoleQuery implements IQuery {
  constructor(public readonly id: string) {}
}

@QueryHandler(GetRoleQuery)
export class GetRoleHandler implements IQueryHandler<GetRoleQuery, RoleDto> {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roleRepo: IRoleRepository,
  ) {}

  async execute(query: GetRoleQuery): Promise<RoleDto> {
    const role = await this.roleRepo.findById(query.id);
    if (!role) {
      throw new NotFoundException(`Role ${query.id} not found`);
    }
    return {
      id: role.id,
      name: role.name.getValue(),
      description: role.description,
      permissions: role.permissions.map((p) => p.getValue()),
      isSystem: role.isSystem,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }
}

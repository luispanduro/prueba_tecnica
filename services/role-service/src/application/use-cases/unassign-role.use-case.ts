import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IRoleRepository, ROLE_REPOSITORY } from '../../domain/repositories/role.repository';
import { IUserRoleRepository, USER_ROLE_REPOSITORY } from '../../domain/repositories/user-role.repository';

export interface UnassignRoleInput {
  userId: string;
  roleId: string;
}

@Injectable()
export class UnassignRoleUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepository: IRoleRepository,
    @Inject(USER_ROLE_REPOSITORY)
    private readonly userRoleRepository: IUserRoleRepository,
  ) {}

  async execute(input: UnassignRoleInput): Promise<void> {
    // Validate role exists
    const role = await this.roleRepository.findById(input.roleId);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Validate assignment exists
    const exists = await this.userRoleRepository.exists(input.userId, input.roleId);
    if (!exists) {
      throw new NotFoundException('Role assignment not found');
    }

    await this.userRoleRepository.unassign(input.userId, input.roleId);
  }
}

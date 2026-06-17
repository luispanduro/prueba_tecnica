import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IRoleRepository, ROLE_REPOSITORY } from '../../domain/repositories/role.repository';
import { IUserRoleRepository, USER_ROLE_REPOSITORY } from '../../domain/repositories/user-role.repository';

@Injectable()
export class DeleteRoleUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepository: IRoleRepository,
    @Inject(USER_ROLE_REPOSITORY)
    private readonly userRoleRepository: IUserRoleRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const role = await this.roleRepository.findById(id);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Delete associated assignments (CASCADE should handle this via FK, but explicit for clarity)
    await this.userRoleRepository.deleteByRoleId(id);
    await this.roleRepository.delete(id);
  }
}

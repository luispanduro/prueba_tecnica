import { Injectable, Inject } from '@nestjs/common';
import { IUserRoleRepository, USER_ROLE_REPOSITORY } from '../../domain/repositories/user-role.repository';

@Injectable()
export class GetUserRolesUseCase {
  constructor(
    @Inject(USER_ROLE_REPOSITORY)
    private readonly userRoleRepository: IUserRoleRepository,
  ) {}

  async execute(userId: string): Promise<string[]> {
    return this.userRoleRepository.findRolesByUserId(userId);
  }
}

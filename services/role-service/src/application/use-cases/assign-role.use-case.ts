import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { IRoleRepository, ROLE_REPOSITORY } from '../../domain/repositories/role.repository';
import { IUserRoleRepository, USER_ROLE_REPOSITORY } from '../../domain/repositories/user-role.repository';
import { UserRole } from '../../domain/entities/user-role.entity';
import { UserServiceClient } from '../../infrastructure/http-clients/user-service.client';

export interface AssignRoleInput {
  userId: string;
  roleId: string;
  assignedBy: string;
}

@Injectable()
export class AssignRoleUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepository: IRoleRepository,
    @Inject(USER_ROLE_REPOSITORY)
    private readonly userRoleRepository: IUserRoleRepository,
    private readonly userServiceClient: UserServiceClient,
  ) {}

  async execute(input: AssignRoleInput): Promise<UserRole> {
    // Validate role exists
    const role = await this.roleRepository.findById(input.roleId);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Validate user exists via User Service
    const userExists = await this.userServiceClient.userExists(input.userId);
    if (!userExists) {
      throw new NotFoundException('User not found');
    }

    // Check duplicate assignment
    if (await this.userRoleRepository.exists(input.userId, input.roleId)) {
      throw new ConflictException('Role is already assigned to this user');
    }

    const userRole = new UserRole({
      id: uuidv4(),
      userId: input.userId,
      roleId: input.roleId,
      assignedAt: new Date(),
      assignedBy: input.assignedBy,
    });

    return this.userRoleRepository.assign(userRole);
  }
}

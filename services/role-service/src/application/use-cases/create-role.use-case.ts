import { Injectable, Inject, ConflictException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { IRoleRepository, ROLE_REPOSITORY } from '../../domain/repositories/role.repository';
import { Role } from '../../domain/entities/role.entity';

export interface CreateRoleInput {
  name: string;
  description?: string;
}

@Injectable()
export class CreateRoleUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepository: IRoleRepository,
  ) {}

  async execute(input: CreateRoleInput): Promise<Role> {
    const normalizedName = input.name.trim().toLowerCase();

    if (await this.roleRepository.existsByName(normalizedName)) {
      throw new ConflictException('Role name already exists');
    }

    const now = new Date();
    const role = new Role({
      id: uuidv4(),
      name: normalizedName,
      description: input.description || '',
      createdAt: now,
      updatedAt: now,
    });

    return this.roleRepository.save(role);
  }
}

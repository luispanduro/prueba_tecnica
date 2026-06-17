import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { IUserRepository, USER_REPOSITORY } from '../../domain/repositories/user.repository';
import { User } from '../../domain/entities/user.entity';

export interface UpdateUserInput {
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
}

@Injectable()
export class UpdateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(id: string, input: UpdateUserInput): Promise<User> {
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Check duplicate username if changing
    if (input.username && input.username !== existingUser.username.value) {
      if (await this.userRepository.existsByUsername(input.username)) {
        throw new ConflictException('Username already exists');
      }
    }

    // Check duplicate email if changing
    if (input.email && input.email.toLowerCase() !== existingUser.email.value) {
      if (await this.userRepository.existsByEmail(input.email.toLowerCase())) {
        throw new ConflictException('Email already exists');
      }
    }

    const updated = await this.userRepository.update(id, input);
    if (!updated) {
      throw new NotFoundException('User not found');
    }

    return updated;
  }
}

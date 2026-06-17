import { Injectable, Inject, ConflictException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { IUserRepository, USER_REPOSITORY } from '../../domain/repositories/user.repository';
import { User } from '../../domain/entities/user.entity';
import { AuthServiceClient } from '../../infrastructure/http-clients/auth-service.client';
import { LoggerService } from '@user-management/shared';

export interface CreateUserInput {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  jwtToken: string; // JWT of the admin performing the action (for Auth Service call)
}

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly authServiceClient: AuthServiceClient,
    private readonly logger: LoggerService,
  ) {}

  async execute(input: CreateUserInput): Promise<User> {
    // Check for duplicate username
    if (await this.userRepository.existsByUsername(input.username)) {
      throw new ConflictException('Username already exists');
    }

    // Check for duplicate email
    if (await this.userRepository.existsByEmail(input.email.toLowerCase())) {
      throw new ConflictException('Email already exists');
    }

    const now = new Date();
    const userId = uuidv4();

    const user = new User({
      id: userId,
      username: input.username,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // 1. Save user in User Service DB
    const savedUser = await this.userRepository.save(user);

    // 2. Create credentials in Auth Service
    try {
      await this.authServiceClient.createCredentials(
        {
          userId: savedUser.id,
          username: input.username,
          email: input.email,
          password: input.password,
        },
        input.jwtToken,
      );
    } catch (error) {
      // Compensation: delete user if Auth Service credential creation fails
      this.logger.error(
        'Auth Service credential creation failed, compensating by deleting user',
        error instanceof Error ? error.stack : undefined,
        { userId: savedUser.id },
      );
      await this.userRepository.delete(savedUser.id);
      throw error;
    }

    return savedUser;
  }
}

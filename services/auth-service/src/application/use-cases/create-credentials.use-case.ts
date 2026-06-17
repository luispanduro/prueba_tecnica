import { Injectable, Inject, ConflictException } from '@nestjs/common';
import { IUserCredentialsRepository, USER_CREDENTIALS_REPOSITORY } from '../../domain/repositories/user-credentials.repository';
import { UserCredentials } from '../../domain/entities/user-credentials.entity';
import { PasswordService } from '../../infrastructure/services/password.service';

export interface CreateCredentialsInput {
  userId: string;
  username: string;
  email: string;
  password: string;
}

@Injectable()
export class CreateCredentialsUseCase {
  constructor(
    @Inject(USER_CREDENTIALS_REPOSITORY)
    private readonly credentialsRepository: IUserCredentialsRepository,
    private readonly passwordService: PasswordService,
  ) {}

  async execute(input: CreateCredentialsInput): Promise<{ userId: string; username: string }> {
    // Validate duplicates
    if (await this.credentialsRepository.existsByUsername(input.username)) {
      throw new ConflictException('Credentials for this username already exist');
    }
    if (await this.credentialsRepository.existsByEmail(input.email)) {
      throw new ConflictException('Credentials for this email already exist');
    }

    // Hash password
    const passwordHash = await this.passwordService.hash(input.password);

    const now = new Date();
    const credentials = new UserCredentials({
      id: input.userId, // Use the same user_id from User Service for consistency
      username: input.username,
      email: input.email,
      passwordHash,
      isActive: true,
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
    });

    await this.credentialsRepository.save(credentials);

    return {
      userId: credentials.id,
      username: credentials.username,
    };
  }
}

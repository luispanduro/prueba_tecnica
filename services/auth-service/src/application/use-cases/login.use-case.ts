import { Injectable, Inject, UnauthorizedException, ServiceUnavailableException } from '@nestjs/common';
import { IUserCredentialsRepository, USER_CREDENTIALS_REPOSITORY } from '../../domain/repositories/user-credentials.repository';
import { PasswordService } from '../../infrastructure/services/password.service';
import { JwtTokenService, TokenResult } from '../../infrastructure/services/jwt-token.service';
import { RoleServiceClient } from '../../infrastructure/http-clients/role-service.client';

export interface LoginInput {
  usernameOrEmail: string;
  password: string;
}

export interface LoginOutput {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: {
    id: string;
    username: string;
    roles: string[];
  };
}

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_CREDENTIALS_REPOSITORY)
    private readonly credentialsRepository: IUserCredentialsRepository,
    private readonly passwordService: PasswordService,
    private readonly jwtTokenService: JwtTokenService,
    private readonly roleServiceClient: RoleServiceClient,
  ) {}

  async execute(input: LoginInput): Promise<LoginOutput> {
    // 1. Find credentials by username or email
    const credentials = await this.findCredentials(input.usernameOrEmail);

    if (!credentials) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2. Check if user is active
    if (!credentials.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 3. Verify password
    const isPasswordValid = await this.passwordService.verify(
      input.password,
      credentials.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 4. Resolve user roles from Role Service
    let roles: string[];
    try {
      roles = await this.roleServiceClient.getUserRoles(credentials.id);
    } catch (error) {
      throw new ServiceUnavailableException(
        'Unable to resolve user roles. Please try again later.',
      );
    }

    // 5. Update last login timestamp
    await this.credentialsRepository.updateLastLogin(credentials.id, new Date());

    // 6. Generate JWT
    const tokenResult: TokenResult = this.jwtTokenService.generate({
      sub: credentials.id,
      username: credentials.username,
      roles,
    });

    return {
      access_token: tokenResult.access_token,
      token_type: tokenResult.token_type,
      expires_in: tokenResult.expires_in,
      user: {
        id: credentials.id,
        username: credentials.username,
        roles,
      },
    };
  }

  private async findCredentials(usernameOrEmail: string) {
    // Try to find by username first, then by email
    const byUsername = await this.credentialsRepository.findByUsername(usernameOrEmail);
    if (byUsername) return byUsername;

    return this.credentialsRepository.findByEmail(usernameOrEmail);
  }
}

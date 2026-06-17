import { UserCredentials } from '../entities/user-credentials.entity';

/**
 * Domain repository interface for UserCredentials.
 * Implementations reside in the infrastructure layer.
 */
export interface IUserCredentialsRepository {
  findById(id: string): Promise<UserCredentials | null>;
  findByUsername(username: string): Promise<UserCredentials | null>;
  findByEmail(email: string): Promise<UserCredentials | null>;
  save(credentials: UserCredentials): Promise<UserCredentials>;
  updateLastLogin(id: string, loginAt: Date): Promise<void>;
  existsByUsername(username: string): Promise<boolean>;
  existsByEmail(email: string): Promise<boolean>;
}

/**
 * Injection token for the repository (used with NestJS DI).
 */
export const USER_CREDENTIALS_REPOSITORY = 'USER_CREDENTIALS_REPOSITORY';

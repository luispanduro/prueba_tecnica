import { User } from '../entities/user.entity';

/**
 * Domain repository interface for User.
 * Implementations reside in the infrastructure layer.
 */
export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  save(user: User): Promise<User>;
  update(id: string, data: Partial<{ username: string; email: string; firstName: string; lastName: string; isActive: boolean }>): Promise<User | null>;
  delete(id: string): Promise<void>;
  existsByUsername(username: string): Promise<boolean>;
  existsByEmail(email: string): Promise<boolean>;
}

/**
 * Injection token for the repository (used with NestJS DI).
 */
export const USER_REPOSITORY = 'USER_REPOSITORY';

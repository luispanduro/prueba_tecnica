import { User } from '../entities/user.entity';
import { Email } from '../value-objects/email.vo';
import { UserStatus } from '../value-objects/user-status.vo';

export interface UserFilter {
  page: number;
  limit: number;
  status?: UserStatus;
  email?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findAll(filter: UserFilter): Promise<PaginatedResult<User>>;
  findByEmail(email: Email): Promise<User | null>;
  save(user: User): Promise<void>;
  delete(id: string): Promise<void>;
}

export const USER_REPOSITORY = 'USER_REPOSITORY';

import { Email } from '../value-objects/email.vo';
import { UserCredentials } from '../entities/user-credentials.entity';

export interface ICredentialsRepository {
  findByEmail(email: Email): Promise<UserCredentials | null>;
  save(credentials: UserCredentials): Promise<void>;
  delete(id: string): Promise<void>;
}

export const CREDENTIALS_REPOSITORY = 'CREDENTIALS_REPOSITORY';

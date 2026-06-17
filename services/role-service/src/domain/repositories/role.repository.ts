import { Role } from '../entities/role.entity';

export interface IRoleRepository {
  findById(id: string): Promise<Role | null>;
  findByName(name: string): Promise<Role | null>;
  findAll(): Promise<Role[]>;
  save(role: Role): Promise<Role>;
  delete(id: string): Promise<void>;
  existsByName(name: string): Promise<boolean>;
}

export const ROLE_REPOSITORY = 'ROLE_REPOSITORY';

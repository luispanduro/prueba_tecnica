import { Role } from '../entities/role.entity';
import { RoleName } from '../value-objects/role-name.vo';

export interface IRoleRepository {
  findById(id: string): Promise<Role | null>;
  findByName(name: RoleName): Promise<Role | null>;
  findAll(): Promise<Role[]>;
  save(role: Role): Promise<void>;
  delete(id: string): Promise<void>;
}

export const ROLE_REPOSITORY = 'ROLE_REPOSITORY';

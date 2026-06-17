import { UserRole } from '../entities/user-role.entity';

export interface IUserRoleRepository {
  assign(userRole: UserRole): Promise<UserRole>;
  unassign(userId: string, roleId: string): Promise<void>;
  findRolesByUserId(userId: string): Promise<string[]>;
  exists(userId: string, roleId: string): Promise<boolean>;
  deleteByRoleId(roleId: string): Promise<void>;
}

export const USER_ROLE_REPOSITORY = 'USER_ROLE_REPOSITORY';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../../../domain/entities/user-role.entity';
import { IUserRoleRepository } from '../../../domain/repositories/user-role.repository';
import { UserRoleOrmEntity } from '../entities/user-role.orm-entity';
import { RoleOrmEntity } from '../entities/role.orm-entity';

@Injectable()
export class TypeOrmUserRoleRepository implements IUserRoleRepository {
  constructor(
    @InjectRepository(UserRoleOrmEntity)
    private readonly ormRepository: Repository<UserRoleOrmEntity>,
    @InjectRepository(RoleOrmEntity)
    private readonly roleRepository: Repository<RoleOrmEntity>,
  ) {}

  async assign(userRole: UserRole): Promise<UserRole> {
    const ormEntity: Partial<UserRoleOrmEntity> = {
      id: userRole.id,
      userId: userRole.userId,
      roleId: userRole.roleId,
      assignedAt: userRole.assignedAt,
      assignedBy: userRole.assignedBy,
    };
    const saved = await this.ormRepository.save(ormEntity);
    return this.toDomain(saved as UserRoleOrmEntity);
  }

  async unassign(userId: string, roleId: string): Promise<void> {
    await this.ormRepository.delete({ userId, roleId });
  }

  async findRolesByUserId(userId: string): Promise<string[]> {
    const assignments = await this.ormRepository.find({ where: { userId } });
    if (assignments.length === 0) return [];

    const roleIds = assignments.map((a) => a.roleId);
    const roles = await this.roleRepository
      .createQueryBuilder('role')
      .where('role.id IN (:...roleIds)', { roleIds })
      .getMany();

    return roles.map((r) => r.name);
  }

  async exists(userId: string, roleId: string): Promise<boolean> {
    const count = await this.ormRepository.count({ where: { userId, roleId } });
    return count > 0;
  }

  async deleteByRoleId(roleId: string): Promise<void> {
    await this.ormRepository.delete({ roleId });
  }

  private toDomain(entity: UserRoleOrmEntity): UserRole {
    return new UserRole({
      id: entity.id,
      userId: entity.userId,
      roleId: entity.roleId,
      assignedAt: entity.assignedAt,
      assignedBy: entity.assignedBy,
    });
  }
}

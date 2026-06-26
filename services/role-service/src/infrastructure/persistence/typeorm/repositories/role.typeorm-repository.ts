import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../../../domain/entities/role.entity';
import { IRoleRepository } from '../../../../domain/repositories/role.repository.interface';
import { RoleName } from '../../../../domain/value-objects/role-name.vo';
import { Permission } from '../../../../domain/value-objects/permission.vo';
import { RoleTypeormEntity } from '../entities/role.typeorm-entity';

@Injectable()
export class RoleTypeormRepository implements IRoleRepository {
  constructor(
    @InjectRepository(RoleTypeormEntity)
    private readonly repo: Repository<RoleTypeormEntity>,
  ) {}

  async findById(id: string): Promise<Role | null> {
    const record = await this.repo.findOne({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async findByName(name: RoleName): Promise<Role | null> {
    const record = await this.repo.findOne({
      where: { name: name.getValue() },
    });
    return record ? this.toDomain(record) : null;
  }

  async findAll(): Promise<Role[]> {
    const records = await this.repo.find();
    return records.map((r) => this.toDomain(r));
  }

  async save(role: Role): Promise<void> {
    const entity = this.toPersistence(role);
    await this.repo.save(entity);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  private toDomain(record: RoleTypeormEntity): Role {
    const perms = (record.permissions ?? [])
      .filter((p) => p.trim() !== '')
      .map((p) => Permission.create(p));
    return Role.reconstitute(
      record.id,
      RoleName.create(record.name),
      record.description ?? '',
      perms,
      record.isSystem,
      record.createdAt,
      record.updatedAt,
    );
  }

  private toPersistence(role: Role): Partial<RoleTypeormEntity> {
    return {
      id: role.id,
      name: role.name.getValue(),
      description: role.description,
      permissions: role.permissions.map((p) => p.getValue()),
      isSystem: role.isSystem,
    };
  }
}

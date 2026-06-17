import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../../domain/entities/role.entity';
import { IRoleRepository } from '../../../domain/repositories/role.repository';
import { RoleOrmEntity } from '../entities/role.orm-entity';

@Injectable()
export class TypeOrmRoleRepository implements IRoleRepository {
  constructor(
    @InjectRepository(RoleOrmEntity)
    private readonly ormRepository: Repository<RoleOrmEntity>,
  ) {}

  async findById(id: string): Promise<Role | null> {
    const entity = await this.ormRepository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByName(name: string): Promise<Role | null> {
    const entity = await this.ormRepository.findOne({ where: { name: name.toLowerCase() } });
    return entity ? this.toDomain(entity) : null;
  }

  async findAll(): Promise<Role[]> {
    const entities = await this.ormRepository.find({ order: { name: 'ASC' } });
    return entities.map((e) => this.toDomain(e));
  }

  async save(role: Role): Promise<Role> {
    const ormEntity = this.toOrm(role);
    const saved = await this.ormRepository.save(ormEntity);
    return this.toDomain(saved);
  }

  async delete(id: string): Promise<void> {
    await this.ormRepository.delete(id);
  }

  async existsByName(name: string): Promise<boolean> {
    const count = await this.ormRepository.count({ where: { name: name.toLowerCase() } });
    return count > 0;
  }

  private toDomain(entity: RoleOrmEntity): Role {
    return new Role({
      id: entity.id,
      name: entity.name,
      description: entity.description,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  private toOrm(domain: Role): Partial<RoleOrmEntity> {
    return {
      id: domain.id,
      name: domain.name.value,
      description: domain.description,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
    };
  }
}

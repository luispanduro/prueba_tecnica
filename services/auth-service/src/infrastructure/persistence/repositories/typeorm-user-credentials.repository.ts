import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserCredentials } from '../../../domain/entities/user-credentials.entity';
import { IUserCredentialsRepository } from '../../../domain/repositories/user-credentials.repository';
import { UserCredentialsOrmEntity } from '../entities/user-credentials.orm-entity';

@Injectable()
export class TypeOrmUserCredentialsRepository implements IUserCredentialsRepository {
  constructor(
    @InjectRepository(UserCredentialsOrmEntity)
    private readonly ormRepository: Repository<UserCredentialsOrmEntity>,
  ) {}

  async findById(id: string): Promise<UserCredentials | null> {
    const entity = await this.ormRepository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByUsername(username: string): Promise<UserCredentials | null> {
    const entity = await this.ormRepository.findOne({ where: { username } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByEmail(email: string): Promise<UserCredentials | null> {
    const entity = await this.ormRepository.findOne({ where: { email } });
    return entity ? this.toDomain(entity) : null;
  }

  async save(credentials: UserCredentials): Promise<UserCredentials> {
    const ormEntity = this.toOrm(credentials);
    const saved = await this.ormRepository.save(ormEntity);
    return this.toDomain(saved);
  }

  async updateLastLogin(id: string, loginAt: Date): Promise<void> {
    await this.ormRepository.update(id, { lastLoginAt: loginAt });
  }

  async existsByUsername(username: string): Promise<boolean> {
    const count = await this.ormRepository.count({ where: { username } });
    return count > 0;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.ormRepository.count({ where: { email } });
    return count > 0;
  }

  private toDomain(entity: UserCredentialsOrmEntity): UserCredentials {
    return new UserCredentials({
      id: entity.id,
      username: entity.username,
      email: entity.email,
      passwordHash: entity.passwordHash,
      isActive: entity.isActive,
      lastLoginAt: entity.lastLoginAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  private toOrm(domain: UserCredentials): Partial<UserCredentialsOrmEntity> {
    return {
      id: domain.id,
      username: domain.username,
      email: domain.email,
      passwordHash: domain.passwordHash,
      isActive: domain.isActive,
      lastLoginAt: domain.lastLoginAt,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
    };
  }
}

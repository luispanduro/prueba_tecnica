import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserCredentials } from '../../../../domain/entities/user-credentials.entity';
import { Email } from '../../../../domain/value-objects/email.vo';
import { PasswordHash } from '../../../../domain/value-objects/password-hash.vo';
import { ICredentialsRepository } from '../../../../domain/repositories/credentials.repository.interface';
import { UserCredentialsTypeormEntity } from '../entities/user-credentials.typeorm-entity';

@Injectable()
export class CredentialsTypeormRepository implements ICredentialsRepository {
  constructor(
    @InjectRepository(UserCredentialsTypeormEntity)
    private readonly repo: Repository<UserCredentialsTypeormEntity>,
  ) {}

  async findByEmail(email: Email): Promise<UserCredentials | null> {
    const entity = await this.repo.findOne({
      where: { email: email.getValue() },
    });
    if (!entity) return null;
    return this.toDomain(entity);
  }

  async save(credentials: UserCredentials): Promise<void> {
    await this.repo.save(this.toPersistence(credentials));
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete({ id });
  }

  private toDomain(entity: UserCredentialsTypeormEntity): UserCredentials {
    return UserCredentials.reconstitute(
      entity.id,
      Email.create(entity.email),
      PasswordHash.fromHash(entity.passwordHash),
      entity.isActive,
      entity.createdAt,
      entity.updatedAt,
    );
  }

  private toPersistence(
    credentials: UserCredentials,
  ): UserCredentialsTypeormEntity {
    const entity = new UserCredentialsTypeormEntity();
    entity.id = credentials.id;
    entity.email = credentials.email.getValue();
    entity.passwordHash = credentials.passwordHash.getValue();
    entity.isActive = credentials.isActive;
    entity.createdAt = credentials.createdAt;
    entity.updatedAt = credentials.updatedAt;
    return entity;
  }
}

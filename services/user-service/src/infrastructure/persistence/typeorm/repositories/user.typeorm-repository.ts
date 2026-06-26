import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { User } from '../../../../domain/entities/user.entity';
import {
  IUserRepository,
  PaginatedResult,
  UserFilter,
} from '../../../../domain/repositories/user.repository.interface';
import { Email } from '../../../../domain/value-objects/email.vo';
import { FullName } from '../../../../domain/value-objects/full-name.vo';
import { UserStatus } from '../../../../domain/value-objects/user-status.vo';
import { UserTypeormEntity } from '../entities/user.typeorm-entity';

@Injectable()
export class UserTypeormRepository implements IUserRepository {
  constructor(
    @InjectRepository(UserTypeormEntity)
    private readonly repo: Repository<UserTypeormEntity>,
  ) {}

  async findById(id: string): Promise<User | null> {
    const record = await this.repo.findOne({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async findAll(filter: UserFilter): Promise<PaginatedResult<User>> {
    const where: Record<string, unknown> = {};
    if (filter.status) where['status'] = filter.status;
    if (filter.email) where['email'] = Like(`%${filter.email}%`);

    const [records, total] = await this.repo.findAndCount({
      where,
      skip: (filter.page - 1) * filter.limit,
      take: filter.limit,
      order: { createdAt: 'DESC' },
    });

    return {
      items: records.map((r) => this.toDomain(r)),
      total,
      page: filter.page,
      limit: filter.limit,
    };
  }

  async findByEmail(email: Email): Promise<User | null> {
    const record = await this.repo.findOne({
      where: { email: email.getValue() },
    });
    return record ? this.toDomain(record) : null;
  }

  async save(user: User): Promise<void> {
    await this.repo.save(this.toPersistence(user));
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  private toDomain(record: UserTypeormEntity): User {
    const roleIds = (record.roleIds ?? []).filter((r) => r.trim() !== '');
    return User.reconstitute(
      record.id,
      FullName.create(record.firstName, record.lastName),
      Email.create(record.email),
      record.status as UserStatus,
      roleIds,
      record.createdAt,
      record.updatedAt,
    );
  }

  private toPersistence(user: User): Partial<UserTypeormEntity> {
    return {
      id: user.id,
      firstName: user.name.getFirstName(),
      lastName: user.name.getLastName(),
      email: user.email.getValue(),
      status: user.status,
      roleIds: user.roleIds,
    };
  }
}

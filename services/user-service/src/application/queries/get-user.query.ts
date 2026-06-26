import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../domain/repositories/user.repository.interface';

export interface UserDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  roleIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class GetUserQuery implements IQuery {
  constructor(public readonly id: string) {}
}

@QueryHandler(GetUserQuery)
export class GetUserHandler implements IQueryHandler<GetUserQuery, UserDto> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
  ) {}

  async execute(query: GetUserQuery): Promise<UserDto> {
    const user = await this.userRepo.findById(query.id);
    if (!user) {
      throw new NotFoundException(`User ${query.id} not found`);
    }
    return {
      id: user.id,
      firstName: user.name.getFirstName(),
      lastName: user.name.getLastName(),
      email: user.email.getValue(),
      status: user.status,
      roleIds: user.roleIds,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

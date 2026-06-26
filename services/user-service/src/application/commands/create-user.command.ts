import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import { ConflictException, Inject, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { User } from '../../domain/entities/user.entity';
import { FullName } from '../../domain/value-objects/full-name.vo';
import { Email } from '../../domain/value-objects/email.vo';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../domain/repositories/user.repository.interface';
import { RabbitmqEventPublisher } from '../../infrastructure/messaging/rabbitmq/event-publisher';
import { RoleServiceClient } from '../../infrastructure/http-clients/role-service.client';

export class CreateUserCommand implements ICommand {
  constructor(
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly email: string,
    public readonly roleIds: string[],
    public readonly correlationId: string,
  ) {}
}

@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    private readonly publisher: RabbitmqEventPublisher,
    private readonly roleClient: RoleServiceClient,
  ) {}

  async execute(command: CreateUserCommand): Promise<string> {
    const email = Email.create(command.email);
    const existing = await this.userRepo.findByEmail(email);
    if (existing) {
      throw new ConflictException(`Email "${command.email}" already in use`);
    }

    for (const roleId of command.roleIds) {
      const exists = await this.roleClient.roleExists(roleId);
      if (!exists) {
        throw new NotFoundException(`Role "${roleId}" not found`);
      }
    }

    const name = FullName.create(command.firstName, command.lastName);
    const user = User.create(uuid(), name, email, command.roleIds);
    await this.userRepo.save(user);

    await this.publisher.publish('users.user.created', {
      eventId: uuid(),
      eventType: 'users.user.created',
      aggregateId: user.id,
      aggregateType: 'User',
      occurredAt: new Date().toISOString(),
      correlationId: command.correlationId,
      payload: {
        userId: user.id,
        name: user.name.getFullName(),
        email: user.email.getValue(),
        roleIds: user.roleIds,
      },
      version: 1,
    });

    return user.id;
  }
}

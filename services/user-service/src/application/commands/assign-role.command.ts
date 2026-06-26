import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../domain/repositories/user.repository.interface';
import { RabbitmqEventPublisher } from '../../infrastructure/messaging/rabbitmq/event-publisher';
import { RoleServiceClient } from '../../infrastructure/http-clients/role-service.client';

export class AssignRoleCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly roleId: string,
    public readonly correlationId: string,
  ) {}
}

@CommandHandler(AssignRoleCommand)
export class AssignRoleHandler implements ICommandHandler<AssignRoleCommand> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    private readonly publisher: RabbitmqEventPublisher,
    private readonly roleClient: RoleServiceClient,
  ) {}

  async execute(command: AssignRoleCommand): Promise<void> {
    const user = await this.userRepo.findById(command.userId);
    if (!user) {
      throw new NotFoundException(`User ${command.userId} not found`);
    }

    const exists = await this.roleClient.roleExists(command.roleId);
    if (!exists) {
      throw new NotFoundException(`Role "${command.roleId}" not found`);
    }

    user.assignRole(command.roleId);
    await this.userRepo.save(user);

    await this.publisher.publish('users.user.role.assigned', {
      eventId: uuid(),
      eventType: 'users.user.role.assigned',
      aggregateId: user.id,
      aggregateType: 'User',
      occurredAt: new Date().toISOString(),
      correlationId: command.correlationId,
      payload: { userId: user.id, roleId: command.roleId },
      version: 1,
    });
  }
}

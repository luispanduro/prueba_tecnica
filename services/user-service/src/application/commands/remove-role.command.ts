import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../domain/repositories/user.repository.interface';
import { RabbitmqEventPublisher } from '../../infrastructure/messaging/rabbitmq/event-publisher';

export class RemoveRoleCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly roleId: string,
    public readonly correlationId: string,
  ) {}
}

@CommandHandler(RemoveRoleCommand)
export class RemoveRoleHandler implements ICommandHandler<RemoveRoleCommand> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    private readonly publisher: RabbitmqEventPublisher,
  ) {}

  async execute(command: RemoveRoleCommand): Promise<void> {
    const user = await this.userRepo.findById(command.userId);
    if (!user) {
      throw new NotFoundException(`User ${command.userId} not found`);
    }

    user.removeRole(command.roleId);
    await this.userRepo.save(user);

    await this.publisher.publish('users.user.role.removed', {
      eventId: uuid(),
      eventType: 'users.user.role.removed',
      aggregateId: user.id,
      aggregateType: 'User',
      occurredAt: new Date().toISOString(),
      correlationId: command.correlationId,
      payload: { userId: user.id, roleId: command.roleId },
      version: 1,
    });
  }
}

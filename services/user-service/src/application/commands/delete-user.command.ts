import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../domain/repositories/user.repository.interface';
import { RabbitmqEventPublisher } from '../../infrastructure/messaging/rabbitmq/event-publisher';

export class DeleteUserCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly correlationId: string,
  ) {}
}

@CommandHandler(DeleteUserCommand)
export class DeleteUserHandler implements ICommandHandler<DeleteUserCommand> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    private readonly publisher: RabbitmqEventPublisher,
  ) {}

  async execute(command: DeleteUserCommand): Promise<void> {
    const user = await this.userRepo.findById(command.id);
    if (!user) {
      throw new NotFoundException(`User ${command.id} not found`);
    }

    await this.userRepo.delete(command.id);

    await this.publisher.publish('users.user.deleted', {
      eventId: uuid(),
      eventType: 'users.user.deleted',
      aggregateId: command.id,
      aggregateType: 'User',
      occurredAt: new Date().toISOString(),
      correlationId: command.correlationId,
      payload: { userId: command.id },
      version: 1,
    });
  }
}

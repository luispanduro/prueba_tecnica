import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { FullName } from '../../domain/value-objects/full-name.vo';
import { Email } from '../../domain/value-objects/email.vo';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../domain/repositories/user.repository.interface';
import { RabbitmqEventPublisher } from '../../infrastructure/messaging/rabbitmq/event-publisher';

export class UpdateUserCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly email: string,
    public readonly correlationId: string,
  ) {}
}

@CommandHandler(UpdateUserCommand)
export class UpdateUserHandler implements ICommandHandler<UpdateUserCommand> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    private readonly publisher: RabbitmqEventPublisher,
  ) {}

  async execute(command: UpdateUserCommand): Promise<void> {
    const user = await this.userRepo.findById(command.id);
    if (!user) {
      throw new NotFoundException(`User ${command.id} not found`);
    }

    const prevName = user.name.getFullName();
    const prevEmail = user.email.getValue();

    user.update(
      FullName.create(command.firstName, command.lastName),
      Email.create(command.email),
    );
    await this.userRepo.save(user);

    const changes: Record<string, unknown> = {};
    if (prevName !== user.name.getFullName()) changes['name'] = user.name.getFullName();
    if (prevEmail !== user.email.getValue()) changes['email'] = user.email.getValue();

    await this.publisher.publish('users.user.updated', {
      eventId: uuid(),
      eventType: 'users.user.updated',
      aggregateId: user.id,
      aggregateType: 'User',
      occurredAt: new Date().toISOString(),
      correlationId: command.correlationId,
      payload: { userId: user.id, changes },
      version: 1,
    });
  }
}

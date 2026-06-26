import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import {
  IRoleRepository,
  ROLE_REPOSITORY,
} from '../../domain/repositories/role.repository.interface';
import { RabbitmqEventPublisher } from '../../infrastructure/messaging/rabbitmq/event-publisher';

export class UpdateRoleCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly description: string,
    public readonly correlationId: string,
  ) {}
}

@CommandHandler(UpdateRoleCommand)
export class UpdateRoleHandler implements ICommandHandler<UpdateRoleCommand> {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roleRepo: IRoleRepository,
    private readonly publisher: RabbitmqEventPublisher,
  ) {}

  async execute(command: UpdateRoleCommand): Promise<void> {
    const role = await this.roleRepo.findById(command.id);
    if (!role) {
      throw new NotFoundException(`Role ${command.id} not found`);
    }

    role.updateDescription(command.description);
    await this.roleRepo.save(role);

    await this.publisher.publish('roles.role.updated', {
      eventId: uuid(),
      eventType: 'roles.role.updated',
      aggregateId: role.id,
      aggregateType: 'Role',
      occurredAt: new Date().toISOString(),
      correlationId: command.correlationId,
      payload: { roleId: role.id, changes: { description: command.description } },
      version: 1,
    });
  }
}

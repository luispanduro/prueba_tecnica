import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import { ConflictException, Inject, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import {
  IRoleRepository,
  ROLE_REPOSITORY,
} from '../../domain/repositories/role.repository.interface';
import { RabbitmqEventPublisher } from '../../infrastructure/messaging/rabbitmq/event-publisher';

export class DeleteRoleCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly correlationId: string,
  ) {}
}

@CommandHandler(DeleteRoleCommand)
export class DeleteRoleHandler implements ICommandHandler<DeleteRoleCommand> {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roleRepo: IRoleRepository,
    private readonly publisher: RabbitmqEventPublisher,
  ) {}

  async execute(command: DeleteRoleCommand): Promise<void> {
    const role = await this.roleRepo.findById(command.id);
    if (!role) {
      throw new NotFoundException(`Role ${command.id} not found`);
    }
    if (role.isSystem) {
      throw new ConflictException('Cannot delete a system role');
    }

    const roleName = role.name.getValue();
    await this.roleRepo.delete(command.id);

    await this.publisher.publish('roles.role.deleted', {
      eventId: uuid(),
      eventType: 'roles.role.deleted',
      aggregateId: command.id,
      aggregateType: 'Role',
      occurredAt: new Date().toISOString(),
      correlationId: command.correlationId,
      payload: { roleId: command.id, name: roleName },
      version: 1,
    });
  }
}

import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { Permission } from '../../domain/value-objects/permission.vo';
import {
  IRoleRepository,
  ROLE_REPOSITORY,
} from '../../domain/repositories/role.repository.interface';
import { RabbitmqEventPublisher } from '../../infrastructure/messaging/rabbitmq/event-publisher';

export class RemovePermissionCommand implements ICommand {
  constructor(
    public readonly roleId: string,
    public readonly permission: string,
    public readonly correlationId: string,
  ) {}
}

@CommandHandler(RemovePermissionCommand)
export class RemovePermissionHandler
  implements ICommandHandler<RemovePermissionCommand>
{
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roleRepo: IRoleRepository,
    private readonly publisher: RabbitmqEventPublisher,
  ) {}

  async execute(command: RemovePermissionCommand): Promise<void> {
    const role = await this.roleRepo.findById(command.roleId);
    if (!role) {
      throw new NotFoundException(`Role ${command.roleId} not found`);
    }

    const perm = Permission.create(command.permission);
    role.removePermission(perm);
    await this.roleRepo.save(role);

    await this.publisher.publish('roles.role.updated', {
      eventId: uuid(),
      eventType: 'roles.role.updated',
      aggregateId: role.id,
      aggregateType: 'Role',
      occurredAt: new Date().toISOString(),
      correlationId: command.correlationId,
      payload: {
        roleId: role.id,
        changes: { removedPermission: command.permission },
      },
      version: 1,
    });
  }
}

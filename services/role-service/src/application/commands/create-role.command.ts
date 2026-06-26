import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import { ConflictException, Inject, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { Role } from '../../domain/entities/role.entity';
import { RoleName } from '../../domain/value-objects/role-name.vo';
import {
  IRoleRepository,
  ROLE_REPOSITORY,
} from '../../domain/repositories/role.repository.interface';
import { RabbitmqEventPublisher } from '../../infrastructure/messaging/rabbitmq/event-publisher';

export class CreateRoleCommand implements ICommand {
  constructor(
    public readonly name: string,
    public readonly description: string,
    public readonly isSystem: boolean,
    public readonly correlationId: string,
  ) {}
}

@CommandHandler(CreateRoleCommand)
export class CreateRoleHandler implements ICommandHandler<CreateRoleCommand> {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roleRepo: IRoleRepository,
    private readonly publisher: RabbitmqEventPublisher,
  ) {}

  async execute(command: CreateRoleCommand): Promise<string> {
    const roleName = RoleName.create(command.name);
    const existing = await this.roleRepo.findByName(roleName);
    if (existing) {
      throw new ConflictException(`Role "${command.name}" already exists`);
    }

    const role = Role.create(uuid(), roleName, command.description, command.isSystem);
    await this.roleRepo.save(role);

    await this.publisher.publish('roles.role.created', {
      eventId: uuid(),
      eventType: 'roles.role.created',
      aggregateId: role.id,
      aggregateType: 'Role',
      occurredAt: new Date().toISOString(),
      correlationId: command.correlationId,
      payload: {
        roleId: role.id,
        name: role.name.getValue(),
        description: role.description,
        isSystem: role.isSystem,
      },
      version: 1,
    });

    return role.id;
  }
}

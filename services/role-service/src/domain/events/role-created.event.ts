export class RoleCreatedEvent {
  constructor(
    public readonly roleId: string,
    public readonly name: string,
    public readonly description: string,
    public readonly isSystem: boolean,
    public readonly correlationId: string,
  ) {}
}

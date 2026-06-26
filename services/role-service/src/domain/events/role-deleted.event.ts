export class RoleDeletedEvent {
  constructor(
    public readonly roleId: string,
    public readonly name: string,
    public readonly correlationId: string,
  ) {}
}

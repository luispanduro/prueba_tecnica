export class UserRoleAssignedEvent {
  constructor(
    public readonly userId: string,
    public readonly roleId: string,
    public readonly correlationId: string,
    public readonly timestamp: string = new Date().toISOString(),
  ) {}
}

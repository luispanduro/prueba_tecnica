export class RoleUpdatedEvent {
  constructor(
    public readonly roleId: string,
    public readonly changes: Record<string, unknown>,
    public readonly correlationId: string,
  ) {}
}

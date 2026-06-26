export class UserUpdatedEvent {
  constructor(
    public readonly userId: string,
    public readonly changes: Record<string, unknown>,
    public readonly correlationId: string,
    public readonly timestamp: string = new Date().toISOString(),
  ) {}
}

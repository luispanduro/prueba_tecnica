export class UserCreatedEvent {
  constructor(
    public readonly userId: string,
    public readonly name: string,
    public readonly email: string,
    public readonly roleIds: string[],
    public readonly correlationId: string,
    public readonly timestamp: string = new Date().toISOString(),
  ) {}
}

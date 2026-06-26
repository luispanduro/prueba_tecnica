export class UserDeletedEvent {
  constructor(
    public readonly userId: string,
    public readonly correlationId: string,
    public readonly timestamp: string = new Date().toISOString(),
  ) {}
}

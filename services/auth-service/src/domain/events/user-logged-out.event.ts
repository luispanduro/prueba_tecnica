export class UserLoggedOutEvent {
  constructor(
    public readonly userId: string,
    public readonly timestamp: Date,
  ) {}
}

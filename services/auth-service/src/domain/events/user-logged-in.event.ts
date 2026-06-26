export class UserLoggedInEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly ip: string,
    public readonly timestamp: Date,
  ) {}
}

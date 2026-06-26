export type LoginFailureReason = 'invalid_credentials' | 'account_inactive';

export class UserLoginFailedEvent {
  constructor(
    public readonly email: string,
    public readonly ip: string,
    public readonly reason: LoginFailureReason,
    public readonly timestamp: Date,
  ) {}
}

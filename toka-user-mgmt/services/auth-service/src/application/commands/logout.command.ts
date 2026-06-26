export class LogoutCommand {
  constructor(
    public readonly userId: string,
    public readonly jti: string,
    public readonly tokenId: string,
    public readonly correlationId?: string,
  ) {}
}

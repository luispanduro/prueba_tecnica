import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { Email } from '../../domain/value-objects/email.vo';
import {
  CREDENTIALS_REPOSITORY,
  ICredentialsRepository,
} from '../../domain/repositories/credentials.repository.interface';
import { AccountInactiveException } from '../../domain/exceptions/account-inactive.exception';
import { InvalidCredentialsException } from '../../domain/exceptions/invalid-credentials.exception';
import { TokenRedisRepository } from '../../infrastructure/persistence/redis/token.redis-repository';
import { RabbitmqEventPublisher } from '../../infrastructure/messaging/rabbitmq/event-publisher';
import { LoginCommand } from '../commands/login.command';

interface LoginResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@CommandHandler(LoginCommand)
export class LoginHandler implements ICommandHandler<LoginCommand> {
  constructor(
    @Inject(CREDENTIALS_REPOSITORY)
    private readonly credentialsRepo: ICredentialsRepository,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly tokenRepo: TokenRedisRepository,
    private readonly eventPublisher: RabbitmqEventPublisher,
  ) {}

  async execute(command: LoginCommand): Promise<LoginResult> {
    const correlationId = command.correlationId ?? uuidv4();
    const email = Email.create(command.email);
    const credentials = await this.credentialsRepo.findByEmail(email);

    if (!credentials) {
      await this.publishFailure(command.email, command.ip, 'invalid_credentials', correlationId);
      throw new InvalidCredentialsException();
    }

    if (!credentials.isActive) {
      await this.publishFailure(command.email, command.ip, 'account_inactive', correlationId);
      throw new AccountInactiveException();
    }

    const valid = await credentials.verifyPassword(command.password);
    if (!valid) {
      await this.publishFailure(command.email, command.ip, 'invalid_credentials', correlationId);
      throw new InvalidCredentialsException();
    }

    const jti = uuidv4();
    const expiresIn = this.config.get<number>('JWT_EXPIRES_IN') ?? 900;
    const refreshTtl = this.config.get<number>('REFRESH_TOKEN_TTL') ?? 604800;

    const accessToken = this.jwtService.sign(
      {
        sub: credentials.id,
        email: credentials.email.getValue(),
        roles: [] as string[],
        permissions: [] as string[],
        jti,
      },
      { expiresIn },
    );

    const tokenId = uuidv4();
    await this.tokenRepo.saveRefreshToken(credentials.id, tokenId, refreshTtl);

    const refreshToken = this.jwtService.sign(
      { sub: credentials.id, tokenId },
      { expiresIn: refreshTtl },
    );

    await this.eventPublisher.publish('auth.user.login.success', {
      eventId: uuidv4(),
      eventType: 'auth.user.login.success',
      aggregateId: credentials.id,
      aggregateType: 'UserCredentials',
      occurredAt: new Date().toISOString(),
      correlationId,
      payload: {
        userId: credentials.id,
        email: credentials.email.getValue(),
        ip: command.ip,
        userAgent: command.userAgent,
      },
      version: 1,
    });

    return { accessToken, refreshToken, expiresIn };
  }

  private async publishFailure(
    email: string,
    ip: string,
    reason: 'invalid_credentials' | 'account_inactive',
    correlationId: string,
  ): Promise<void> {
    await this.eventPublisher.publish('auth.user.login.failed', {
      eventId: uuidv4(),
      eventType: 'auth.user.login.failed',
      aggregateId: email,
      aggregateType: 'UserCredentials',
      occurredAt: new Date().toISOString(),
      correlationId,
      payload: { email, ip, reason },
      version: 1,
    });
  }
}

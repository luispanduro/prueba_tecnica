import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { TokenRedisRepository } from '../../infrastructure/persistence/redis/token.redis-repository';
import { RabbitmqEventPublisher } from '../../infrastructure/messaging/rabbitmq/event-publisher';
import { LogoutCommand } from '../commands/logout.command';

@CommandHandler(LogoutCommand)
export class LogoutHandler implements ICommandHandler<LogoutCommand> {
  constructor(
    private readonly tokenRepo: TokenRedisRepository,
    private readonly config: ConfigService,
    private readonly eventPublisher: RabbitmqEventPublisher,
  ) {}

  async execute(command: LogoutCommand): Promise<void> {
    const expiresIn = this.config.get<number>('JWT_EXPIRES_IN') ?? 900;

    await this.tokenRepo.blacklistToken(command.jti, expiresIn);
    await this.tokenRepo.deleteRefreshToken(command.userId, command.tokenId);

    await this.eventPublisher.publish('auth.user.logout', {
      eventId: uuidv4(),
      eventType: 'auth.user.logout',
      aggregateId: command.userId,
      aggregateType: 'UserCredentials',
      occurredAt: new Date().toISOString(),
      correlationId: command.correlationId ?? uuidv4(),
      payload: { userId: command.userId },
      version: 1,
    });
  }
}

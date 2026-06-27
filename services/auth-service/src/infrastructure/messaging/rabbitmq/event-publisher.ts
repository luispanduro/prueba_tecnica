import { Inject, Injectable, Logger } from '@nestjs/common';
import { ChannelWrapper } from 'amqp-connection-manager';
import { DomainEvent } from '../../../domain/events/domain-event.interface';
import { RABBITMQ_CLIENT } from './rabbitmq.constants';

const EXCHANGE = 'toka.events';

@Injectable()
export class RabbitmqEventPublisher {
  private readonly logger = new Logger(RabbitmqEventPublisher.name);
  private channel: ChannelWrapper;

  constructor(@Inject(RABBITMQ_CLIENT) private readonly connection: ReturnType<typeof import('amqp-connection-manager').connect>) {
    this.channel = this.connection.createChannel({
      setup: (ch: import('amqplib').Channel) =>
        ch.assertExchange(EXCHANGE, 'topic', { durable: true }),
    });
  }

  async publish(routingKey: string, event: DomainEvent): Promise<void> {
    try {
      this.logger.log({
        action: 'event.published',
        routingKey,
        eventId: event.eventId,
        eventType: event.eventType,
      });

      await this.channel.publish(
        EXCHANGE,
        routingKey,
        Buffer.from(JSON.stringify(event)),
        { persistent: true, contentType: 'application/json' },
      );
    } catch (error) {
      this.logger.error({
        action: 'event.publish.failed',
        routingKey,
        eventId: event.eventId,
        error: (error as Error).message,
      });
    }
  }
}

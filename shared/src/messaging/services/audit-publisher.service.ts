import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { connect, Channel } from 'amqplib';
import { LoggerService } from '../../logging/logger.service';
import { AuditEventMessage } from '../interfaces/audit-event.interface';
import {
  AUDIT_EXCHANGE,
  AUDIT_EXCHANGE_TYPE,
} from '../constants/messaging.constants';

/**
 * Generic publisher service for audit events.
 * Publishes messages to the `audit.events` topic exchange.
 */
@Injectable()
export class AuditPublisherService implements OnModuleInit, OnModuleDestroy {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private connection: any = null;
  private channel: Channel | null = null;
  private isConnected = false;

  constructor(private readonly logger: LoggerService) {}

  async onModuleInit(): Promise<void> {
    await this.connectToRabbitMQ();
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  /**
   * Publish an audit event to the audit.events exchange.
   * @param routingKey - The routing key for the event (e.g., 'audit.user.created')
   * @param message - The audit event message
   */
  async publish(routingKey: string, message: AuditEventMessage): Promise<void> {
    if (!this.channel || !this.isConnected) {
      this.logger.warn('RabbitMQ not connected. Audit event not published.', {
        routing_key: routingKey,
        event_type: message.event_type,
      });
      return;
    }

    try {
      const buffer = Buffer.from(JSON.stringify(message));

      this.channel.publish(AUDIT_EXCHANGE, routingKey, buffer, {
        persistent: true,
        contentType: 'application/json',
        timestamp: Date.now(),
        headers: {
          correlation_id: message.correlation_id,
        },
      });

      this.logger.info('Audit event published', {
        routing_key: routingKey,
        event_type: message.event_type,
        correlation_id: message.correlation_id,
      });
    } catch (error) {
      this.logger.error(
        'Failed to publish audit event',
        error instanceof Error ? error.stack : undefined,
        {
          routing_key: routingKey,
          event_type: message.event_type,
        },
      );
    }
  }

  private async connectToRabbitMQ(): Promise<void> {
    const url = this.getConnectionUrl();

    try {
      this.connection = await connect(url);
      this.channel = await this.connection.createChannel();

      // Declare the audit exchange as durable topic
      await this.channel!.assertExchange(AUDIT_EXCHANGE, AUDIT_EXCHANGE_TYPE, {
        durable: true,
      });

      this.isConnected = true;
      this.logger.info('Connected to RabbitMQ', { exchange: AUDIT_EXCHANGE });

      this.connection.on('close', () => {
        this.isConnected = false;
        this.logger.warn('RabbitMQ connection closed');
      });

      this.connection.on('error', (err: Error) => {
        this.isConnected = false;
        this.logger.error('RabbitMQ connection error', err.message);
      });
    } catch (error) {
      this.isConnected = false;
      this.logger.error(
        'Failed to connect to RabbitMQ',
        error instanceof Error ? error.stack : undefined,
        { url: url.replace(/\/\/.*@/, '//***@') },
      );
    }
  }

  private async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      this.isConnected = false;
    } catch (error) {
      this.logger.error(
        'Error disconnecting from RabbitMQ',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private getConnectionUrl(): string {
    if (process.env.RABBITMQ_URL) {
      return process.env.RABBITMQ_URL;
    }

    const host = process.env.RABBITMQ_HOST || 'localhost';
    const port = process.env.RABBITMQ_PORT || '5672';
    const user = process.env.RABBITMQ_USER || 'guest';
    const password = process.env.RABBITMQ_PASSWORD || 'guest';

    return `amqp://${user}:${password}@${host}:${port}`;
  }
}

import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { connect, Channel, ConsumeMessage } from 'amqplib';
import { LoggerService } from '@user-management/shared';
import {
  AUDIT_EXCHANGE,
  AUDIT_EXCHANGE_TYPE,
  QUEUES,
  QUEUE_BINDINGS,
} from '@user-management/shared';
import { AuditEvent } from '../../domain/entities/audit-event.entity';
import { IAuditEventRepository, AUDIT_EVENT_REPOSITORY } from '../../domain/repositories/audit-event.repository';

@Injectable()
export class AuditEventConsumer implements OnModuleInit {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private connection: any = null;
  private channel: Channel | null = null;

  constructor(
    @Inject(AUDIT_EVENT_REPOSITORY)
    private readonly auditRepository: IAuditEventRepository,
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.connectAndConsume();
  }

  private async connectAndConsume(): Promise<void> {
    const url = this.getConnectionUrl();

    try {
      this.connection = await connect(url);
      this.channel = await this.connection.createChannel();

      // Ensure exchange exists
      await this.channel!.assertExchange(AUDIT_EXCHANGE, AUDIT_EXCHANGE_TYPE, { durable: true });

      // Declare and bind all queues
      const queueEntries = Object.entries(QUEUE_BINDINGS) as [string, string][];
      for (const [queueName, bindingPattern] of queueEntries) {
        await this.channel!.assertQueue(queueName, { durable: true });
        await this.channel!.bindQueue(queueName, AUDIT_EXCHANGE, bindingPattern);
      }

      // Set prefetch to process one message at a time per queue
      await this.channel!.prefetch(1);

      // Start consuming from all queues
      const allQueues = Object.values(QUEUES);
      for (const queue of allQueues) {
        await this.channel!.consume(queue, (msg) => this.handleMessage(msg, queue), {
          noAck: false,
        });
      }

      this.logger.info('Audit event consumer connected and listening', {
        queues: allQueues,
      });

      this.connection.on('close', () => {
        this.logger.warn('RabbitMQ connection closed in audit consumer');
      });

      this.connection.on('error', (err: Error) => {
        this.logger.error('RabbitMQ connection error in audit consumer', err.message);
      });
    } catch (error) {
      this.logger.error(
        'Failed to connect audit consumer to RabbitMQ',
        error instanceof Error ? error.stack : undefined,
        { url: url.replace(/\/\/.*@/, '//***@') },
      );
    }
  }

  private async handleMessage(msg: ConsumeMessage | null, queue: string): Promise<void> {
    if (!msg || !this.channel) return;

    try {
      const content = JSON.parse(msg.content.toString());

      // Validate minimum structure
      if (!content.event_type || !content.action || !content.service_origin) {
        this.logger.warn('Invalid audit event message, missing required fields', {
          queue,
          content_preview: JSON.stringify(content).slice(0, 200),
        });
        this.channel.ack(msg);
        return;
      }

      const auditEvent = new AuditEvent({
        eventType: content.event_type,
        actorId: content.actor_id || '',
        actorUsername: content.actor_username || '',
        resourceType: content.resource_type || '',
        resourceId: content.resource_id || null,
        action: content.action,
        details: content.details || {},
        ipAddress: content.ip_address || '',
        correlationId: content.correlation_id || '',
        timestamp: content.timestamp || new Date().toISOString(),
        serviceOrigin: content.service_origin,
      });

      // Persist to MongoDB
      await this.auditRepository.save(auditEvent);

      // Ack only after successful persistence
      this.channel.ack(msg);

      this.logger.info('Audit event persisted', {
        event_type: auditEvent.eventType,
        correlation_id: auditEvent.correlationId,
        queue,
      });
    } catch (error) {
      this.logger.error(
        'Error processing audit event',
        error instanceof Error ? error.stack : undefined,
        { queue },
      );

      // Nack with requeue=false to avoid infinite loop
      this.channel.nack(msg, false, false);
    }
  }

  private getConnectionUrl(): string {
    if (this.config.get<string>('RABBITMQ_URL')) {
      return this.config.get<string>('RABBITMQ_URL')!;
    }
    const host = this.config.get<string>('RABBITMQ_HOST', 'localhost');
    const port = this.config.get<string>('RABBITMQ_PORT', '5672');
    const user = this.config.get<string>('RABBITMQ_USER', 'guest');
    const password = this.config.get<string>('RABBITMQ_PASSWORD', 'guest');
    return `amqp://${user}:${password}@${host}:${port}`;
  }
}

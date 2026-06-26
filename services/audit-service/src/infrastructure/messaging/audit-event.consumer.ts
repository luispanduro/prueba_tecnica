import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { connect } from 'amqp-connection-manager';
import type { Channel, ConsumeMessage } from 'amqplib';
import { AuditLog, AuditLogDocument } from '../../domain/schemas/audit-log.schema';

const EXCHANGE = 'toka.events';
const EXCHANGE_TYPE = 'topic';
const DLX = 'toka.dlx';
const DLQ = 'audit.dlq';
const QUEUE = 'audit.events.queue';
const ROUTING_KEY = '#';
const PREFETCH = 10;
const MAX_RETRIES = 3;

interface EventPayload {
  eventId: string;
  eventType: string;
  aggregateId?: string;
  correlationId?: string;
  occurredAt?: string;
  payload?: Record<string, unknown>;
}

interface EventMapping {
  service: string;
  resourceType: string;
  action: string;
  status: 'success' | 'failure';
}

const EVENT_MAP: Record<string, EventMapping> = {
  'auth.user.registered':      { service: 'auth-service',  resourceType: 'user',    action: 'register',    status: 'success' },
  'auth.user.login.success':   { service: 'auth-service',  resourceType: 'session', action: 'login',       status: 'success' },
  'auth.user.login.failed':    { service: 'auth-service',  resourceType: 'session', action: 'login',       status: 'failure' },
  'auth.user.logout':          { service: 'auth-service',  resourceType: 'session', action: 'logout',      status: 'success' },
  'users.user.created':        { service: 'user-service',  resourceType: 'user',    action: 'create',      status: 'success' },
  'users.user.updated':        { service: 'user-service',  resourceType: 'user',    action: 'update',      status: 'success' },
  'users.user.deleted':        { service: 'user-service',  resourceType: 'user',    action: 'delete',      status: 'success' },
  'users.user.role.assigned':  { service: 'user-service',  resourceType: 'user',    action: 'assign_role', status: 'success' },
  'users.user.role.removed':   { service: 'user-service',  resourceType: 'user',    action: 'remove_role', status: 'success' },
  'roles.role.created':        { service: 'role-service',  resourceType: 'role',    action: 'create',      status: 'success' },
  'roles.role.updated':        { service: 'role-service',  resourceType: 'role',    action: 'update',      status: 'success' },
  'roles.role.deleted':        { service: 'role-service',  resourceType: 'role',    action: 'delete',      status: 'success' },
};

@Injectable()
export class AuditEventConsumer implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuditEventConsumer.name);

  constructor(
    private readonly config: ConfigService,
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
  ) {}

  onApplicationBootstrap(): void {
    const url = this.config.get<string>('RABBITMQ_URL') as string;
    const connection = connect([url]);

    connection.createChannel({
      setup: async (channel: Channel) => {
        await channel.assertExchange(DLX, 'direct', { durable: true });
        await channel.assertQueue(DLQ, { durable: true });
        await channel.bindQueue(DLQ, DLX, '');

        await channel.assertExchange(EXCHANGE, EXCHANGE_TYPE, { durable: true });
        await channel.assertQueue(QUEUE, {
          durable: true,
          arguments: {
            'x-dead-letter-exchange': DLX,
          },
        });
        await channel.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY);
        await channel.prefetch(PREFETCH);

        await channel.consume(QUEUE, (msg) => this.handleMessage(channel, msg));
      },
    });

    connection.on('connect', () =>
      this.logger.log({ action: 'consumer.connected', queue: QUEUE }),
    );
    connection.on('disconnect', ({ err }: { err: Error }) =>
      this.logger.warn({ action: 'consumer.disconnected', error: err?.message }),
    );
  }

  private async handleMessage(
    channel: Channel,
    msg: ConsumeMessage | null,
  ): Promise<void> {
    if (!msg) return;

    let event: EventPayload | null = null;

    try {
      event = JSON.parse(msg.content.toString()) as EventPayload;

      if (!event.eventId || !event.eventType) {
        this.logger.error({
          action: 'consumer.message.malformed',
          reason: 'Missing eventId or eventType',
        });
        channel.nack(msg, false, false);
        return;
      }

      const existing = await this.auditLogModel
        .findOne({ eventId: event.eventId })
        .lean()
        .exec();

      if (existing) {
        this.logger.log({
          action: 'consumer.message.duplicate',
          eventId: event.eventId,
        });
        channel.ack(msg);
        return;
      }

      const mapping = EVENT_MAP[event.eventType];
      if (!mapping) {
        this.logger.warn({
          action: 'consumer.event.unmapped',
          eventType: event.eventType,
        });
        channel.ack(msg);
        return;
      }

      const payload = event.payload ?? {};

      await this.auditLogModel.create({
        eventId: event.eventId,
        eventType: event.eventType,
        service: mapping.service,
        resourceType: mapping.resourceType,
        action: mapping.action,
        status: mapping.status,
        userId: (payload['userId'] as string | undefined) ?? null,
        actorEmail: (payload['email'] as string | undefined) ?? null,
        resourceId: (event.aggregateId as string | undefined) ?? null,
        correlationId: event.correlationId ?? '',
        metadata: payload,
        timestamp: event.occurredAt ? new Date(event.occurredAt) : new Date(),
      });

      this.logger.log({
        action: 'consumer.message.saved',
        eventId: event.eventId,
        eventType: event.eventType,
      });

      channel.ack(msg);
    } catch (error) {
      this.logger.error({
        action: 'consumer.message.error',
        eventId: event?.eventId,
        error: (error as Error).message,
      });

      const deathHeaders = msg.properties.headers?.['x-death'] as
        | Array<{ count: number }>
        | undefined;
      const retryCount = deathHeaders?.[0]?.count ?? 0;

      if (retryCount >= MAX_RETRIES) {
        this.logger.warn({
          action: 'consumer.message.max_retries',
          eventId: event?.eventId,
          retries: retryCount,
        });
        channel.nack(msg, false, false);
      } else {
        channel.nack(msg, false, true);
      }
    }
  }
}

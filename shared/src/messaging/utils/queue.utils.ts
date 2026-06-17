import { Channel } from 'amqplib';
import {
  AUDIT_EXCHANGE,
  QUEUES,
  QUEUE_BINDINGS,
} from '../constants/messaging.constants';

/**
 * Declares all audit queues as durable and binds them to the audit exchange.
 * Intended for use by the Audit Service consumer setup.
 */
export async function declareAuditQueues(channel: Channel): Promise<void> {
  const queueEntries = Object.entries(QUEUE_BINDINGS) as [string, string][];

  for (const [queueName, bindingPattern] of queueEntries) {
    await channel.assertQueue(queueName, {
      durable: true,
    });

    await channel.bindQueue(queueName, AUDIT_EXCHANGE, bindingPattern);
  }
}

/**
 * Returns all queue names for audit event consumption.
 */
export function getAuditQueueNames(): string[] {
  return Object.values(QUEUES);
}

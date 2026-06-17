import { Global, Module } from '@nestjs/common';
import { AuditPublisherService } from './services/audit-publisher.service';

/**
 * MessagingModule provides the AuditPublisherService for publishing
 * audit events to RabbitMQ.
 *
 * Usage in microservices:
 * @Module({ imports: [MessagingModule] })
 * Then inject AuditPublisherService where needed.
 */
@Global()
@Module({
  providers: [AuditPublisherService],
  exports: [AuditPublisherService],
})
export class MessagingModule {}

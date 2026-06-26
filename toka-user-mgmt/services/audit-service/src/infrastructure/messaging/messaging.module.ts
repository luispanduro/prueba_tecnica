import { Module } from '@nestjs/common';
import { AuditDatabaseModule } from '../persistence/mongoose/audit-database.module';
import { AuditEventConsumer } from './audit-event.consumer';

@Module({
  imports: [AuditDatabaseModule],
  providers: [AuditEventConsumer],
  exports: [AuditEventConsumer],
})
export class MessagingModule {}

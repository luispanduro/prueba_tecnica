import { AuditEvent } from '../entities/audit-event.entity';

export interface AuditEventRecord extends AuditEvent {
  id: string;
}

export interface IAuditEventRepository {
  save(event: AuditEvent): Promise<void>;
  findRecent(limit: number): Promise<AuditEventRecord[]>;
}

export const AUDIT_EVENT_REPOSITORY = 'AUDIT_EVENT_REPOSITORY';

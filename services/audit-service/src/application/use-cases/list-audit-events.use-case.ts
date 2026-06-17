import { Injectable, Inject } from '@nestjs/common';
import { IAuditEventRepository, AuditEventRecord, AUDIT_EVENT_REPOSITORY } from '../../domain/repositories/audit-event.repository';

@Injectable()
export class ListAuditEventsUseCase {
  private readonly DEFAULT_LIMIT = 100;

  constructor(
    @Inject(AUDIT_EVENT_REPOSITORY)
    private readonly auditRepository: IAuditEventRepository,
  ) {}

  async execute(limit?: number): Promise<AuditEventRecord[]> {
    const effectiveLimit = limit && limit > 0 ? Math.min(limit, this.DEFAULT_LIMIT) : this.DEFAULT_LIMIT;
    return this.auditRepository.findRecent(effectiveLimit);
  }
}

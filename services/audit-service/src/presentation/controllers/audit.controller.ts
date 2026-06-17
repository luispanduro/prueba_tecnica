import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RoleGuard, Roles } from '@user-management/shared';
import { ListAuditEventsUseCase } from '../../application/use-cases/list-audit-events.use-case';

@Controller('audit')
export class AuditController {
  constructor(private readonly listAuditEventsUseCase: ListAuditEventsUseCase) {}

  @Get('events')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('admin')
  async getEvents() {
    const events = await this.listAuditEventsUseCase.execute();

    return events.map((event) => ({
      id: event.id,
      event_type: event.eventType,
      actor_id: event.actorId,
      actor_username: event.actorUsername,
      resource_type: event.resourceType,
      resource_id: event.resourceId,
      action: event.action,
      details: event.details,
      ip_address: event.ipAddress,
      correlation_id: event.correlationId,
      timestamp: event.timestamp,
      service_origin: event.serviceOrigin,
    }));
  }
}

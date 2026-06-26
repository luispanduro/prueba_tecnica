export interface DomainEvent {
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  occurredAt: string;
  correlationId: string;
  payload: Record<string, unknown>;
  version: number;
}

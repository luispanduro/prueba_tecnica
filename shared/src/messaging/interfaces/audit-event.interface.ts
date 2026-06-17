/**
 * Represents an audit event message published to RabbitMQ.
 */
export interface AuditEventMessage {
  event_type: string;
  actor_id: string;
  actor_username: string;
  resource_type: string;
  resource_id: string | null;
  action: string;
  details: Record<string, unknown>;
  ip_address: string;
  correlation_id: string;
  timestamp: string;
  service_origin: string;
}
